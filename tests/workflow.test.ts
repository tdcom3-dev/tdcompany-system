import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { organizationSchema } from "../shared/domain.ts";
import { seed } from "../server/seed.ts";
import { plan } from "../server/planner.ts";
import { Store } from "../server/store.ts";
import { Runner } from "../server/runner.ts";
import { createApp } from "../server/app.ts";
import type { Provider } from "../server/provider.ts";
const brief = {
  title: "출시 배너와 소개 웹 개발",
  brief: "새로운 서비스의 출시 배너와 소개 웹 페이지를 만들어 주세요.",
};
async function finish(runner: Runner, id: string) {
  for (let i = 0; i < 100 && runner.active.has(id); i++)
    await new Promise((r) => setTimeout(r, 10));
  assert.equal(runner.active.has(id), false, "runner must finish");
}
test("기획 → 이미지 → 개발 → 검수 배정과 skill 스냅샷 보존", () => {
  const org = structuredClone(seed);
  const task = plan(org, brief);
  assert.deepEqual(
    task.steps.map((s) => s.role.category),
    ["planning", "image", "development", "review"],
  );
  assert.equal(task.steps.at(-1)!.dependsOn.length, 3);
  org.skills[0].instructions = "수정됨";
  assert.notEqual(task.steps[0].skills[0].instructions, "수정됨");
  assert.throws(() => plan(org, { ...brief, roleIds: ["unknown"] }));
});
test("유효하지 않은 조직도 및 순환 관계 거부", () => {
  const org = structuredClone(seed);
  org.roles[0].reportsTo = org.roles[1].id;
  org.roles[1].reportsTo = org.roles[0].id;
  assert.equal(organizationSchema.safeParse(org).success, false);
  const badSkill = structuredClone(seed);
  badSkill.roles[0].skillIds = ["absent"];
  assert.equal(organizationSchema.safeParse(badSkill).success, false);
  const duplicate = structuredClone(seed);
  duplicate.roles.push(duplicate.roles[0]);
  assert.equal(organizationSchema.safeParse(duplicate).success, false);
});
test("의존 순서대로 실행하고 대표 승인 전에는 완료하지 않음", async () => {
  const store = new Store(":memory:");
  const seen: string[] = [];
  const runner = new Runner(store, {
    ready: true,
    async execute(task, step) {
      for (const dep of step.dependsOn)
        assert.equal(task.steps.find((s) => s.id === dep)!.status, "succeeded");
      seen.push(step.role.category);
      return { kind: "text", text: `테스트 산출물: ${step.role.name}` };
    },
  });
  const task = plan(seed, brief);
  store.update((s) => s.tasks.push(task));
  runner.start(task.id);
  assert.throws(() => runner.start(task.id));
  await finish(runner, task.id);
  assert.equal(store.read().tasks[0].status, "awaiting_approval");
  assert.equal(seen.length, 4);
  assert.throws(() => runner.start(task.id));
  store.close();
});
test("실패한 단계에서 중단하고 재시도 시 완료된 작업을 보존", async () => {
  const store = new Store(":memory:");
  let fail = true;
  const calls: string[] = [];
  const runner = new Runner(store, {
    ready: true,
    async execute(_task, step) {
      calls.push(step.role.category);
      if (step.role.category === "image" && fail)
        throw new Error("테스트 공급자 오류");
      return { kind: "text", text: "test" };
    },
  });
  const task = plan(seed, brief);
  store.update((s) => s.tasks.push(task));
  runner.start(task.id);
  await finish(runner, task.id);
  assert.equal(store.read().tasks[0].status, "failed");
  assert.deepEqual(calls, ["planning", "image"]);
  fail = false;
  runner.start(task.id);
  await finish(runner, task.id);
  assert.deepEqual(calls, [
    "planning",
    "image",
    "image",
    "development",
    "review",
  ]);
  assert.equal(store.read().tasks[0].status, "awaiting_approval");
  store.close();
});
test("API 키가 없으면 업무 상태를 바꾸거나 공급자를 호출하지 않음", () => {
  const store = new Store(":memory:");
  const task = plan(seed, brief);
  store.update((s) => s.tasks.push(task));
  const runner = new Runner(store, {
    ready: false,
    async execute() {
      throw new Error("must not execute");
    },
  });
  assert.throws(() => runner.start(task.id), /AI_API_KEY/);
  assert.equal(store.read().tasks[0].status, "planned");
  store.close();
});
test("SQLite 영속성과 실행 중 서버 재시작 복구", () => {
  const dir = mkdtempSync(join(tmpdir(), "td-company-"));
  const path = join(dir, "test.sqlite");
  try {
    const store = new Store(path);
    const task = plan(seed, brief);
    task.status = "running";
    task.steps[0].status = "running";
    task.steps[0].remoteId = "video_test";
    store.update((s) => s.tasks.push(task));
    store.close();
    const reopened = new Store(path);
    new Runner(reopened, {
      ready: false,
      async execute() {
        throw new Error("unreachable");
      },
    });
    assert.equal(reopened.read().tasks[0].status, "failed");
    assert.equal(reopened.read().tasks[0].steps[0].remoteId, "video_test");
    reopened.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test("HTTP API: 생성, 배정, 실행, 산출물, 승인, 가져오기 및 출처 검사", async () => {
  const store = new Store(":memory:");
  const provider: Provider = {
    ready: true,
    async execute() {
      return { kind: "text", text: "mock provider output" };
    },
  };
  const runner = new Runner(store, provider);
  const server = createApp(store, runner, "/tmp").listen(0, "127.0.0.1");
  await once(server, "listening");
  const addr = server.address();
  assert.ok(addr && typeof addr !== "string");
  const base = `http://127.0.0.1:${addr.port}`;
  const post = (path: string, body = {}) =>
    fetch(`${base}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal((await post("/tasks", {})).status, 400);
    const response = await post("/tasks", {
      ...brief,
      roleIds: ["planning", "review"],
    });
    assert.equal(response.status, 201);
    const task = await response.json();
    assert.equal((await post(`/tasks/${task.id}/approve`)).status, 400);
    assert.equal((await post(`/tasks/${task.id}/run`)).status, 202);
    await finish(runner, task.id);
    const artifact = await fetch(
      `${base}/api/tasks/${task.id}/artifacts/${task.steps[0].id}`,
    );
    assert.equal(await artifact.text(), "mock provider output");
    assert.equal((await post(`/tasks/${task.id}/approve`)).status, 200);
    assert.equal(store.read().tasks[0].status, "completed");
    assert.equal((await post("/organization/import", {})).status, 400);
    assert.equal(store.read().organization.roles.length, 6);
    const update = structuredClone(seed);
    update.company.name = "Imported Company";
    assert.equal((await post("/organization/import", update)).status, 200);
    assert.equal(store.read().tasks[0].company.name, "TD Company");
    const crossOrigin = await fetch(`${base}/api/tasks`, {
      method: "POST",
      headers: {
        Origin: "https://example.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brief),
    });
    assert.equal(crossOrigin.status, 403);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    store.close();
  }
});
