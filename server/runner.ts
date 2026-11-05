import type { Provider } from "./provider.ts";
import type { Task } from "../shared/domain.ts";
import type { Store } from "./store.ts";
const event = (task: Task, message: string) =>
  task.events.push({ at: new Date().toISOString(), message });
export class Runner {
  active = new Set<string>();
  constructor(
    private store: Store,
    private provider: Provider,
  ) {
    store.update((state) => {
      for (const task of state.tasks)
        if (task.status === "running") {
          task.status = "failed";
          for (const step of task.steps)
            if (step.status === "running") {
              step.status = "failed";
              step.error =
                "서버 재시작으로 실행이 중단되었습니다. 재시도 전 공급자 사용 내역을 확인하세요.";
            }
          event(task, "실행이 중단되었습니다. 완료된 산출물은 보존했습니다.");
        }
    });
  }
  get ready() {
    return this.provider.ready;
  }
  start(id: string) {
    if (!this.ready)
      throw new Error(
        "AI API 연결이 필요합니다. 환경 설정에 AI_API_KEY를 등록하세요.",
      );
    if (this.active.has(id)) throw new Error("이미 실행 중인 업무입니다.");
    this.store.update((state) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) throw new Error("업무를 찾을 수 없습니다.");
      if (!["planned", "failed"].includes(task.status))
        throw new Error("현재 상태에서는 실행할 수 없습니다.");
      task.status = "running";
      event(task, "실장이 역할별 실행을 시작했습니다.");
    });
    this.active.add(id);
    void this.run(id).finally(() => this.active.delete(id));
  }
  private async run(id: string) {
    try {
      while (true) {
        const task = this.store.read().tasks.find((t) => t.id === id)!;
        const step = task.steps.find((s) => s.status !== "succeeded");
        if (!step) {
          this.store.update((state) => {
            const t = state.tasks.find((t) => t.id === id)!;
            t.status = "awaiting_approval";
            event(
              t,
              "담당 봇의 작업이 끝났습니다. 대표의 최종 승인을 기다립니다.",
            );
          });
          return;
        }
        if (
          step.dependsOn.some(
            (dep) =>
              !task.steps.some((s) => s.id === dep && s.status === "succeeded"),
          )
        )
          throw new Error("선행 작업이 완료되지 않았습니다.");
        this.store.update((state) => {
          const t = state.tasks.find((t) => t.id === id)!;
          const s = t.steps.find((s) => s.id === step.id)!;
          s.status = "running";
          delete s.error;
          event(t, `${s.role.name} 작업 시작`);
        });
        const artifact = await this.provider.execute(task, step, (remoteId) =>
          this.store.update((state) => {
            state.tasks
              .find((t) => t.id === id)!
              .steps.find((s) => s.id === step.id)!.remoteId = remoteId;
          }),
        );
        this.store.update((state) => {
          const t = state.tasks.find((t) => t.id === id)!;
          const s = t.steps.find((s) => s.id === step.id)!;
          s.status = "succeeded";
          s.artifact = artifact;
          event(t, `${s.role.name} 산출물 도착`);
        });
      }
    } catch (error) {
      this.store.update((state) => {
        const t = state.tasks.find((t) => t.id === id)!;
        t.status = "failed";
        const s = t.steps.find((s) => s.status === "running");
        if (s) {
          s.status = "failed";
          s.error = error instanceof Error ? error.message : "실행 실패";
        }
        event(t, "실행을 중단했습니다. 오류를 확인한 뒤 재시도할 수 있습니다.");
      });
    }
  }
}
