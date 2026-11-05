import express from "express";
import { resolve } from "node:path";
import { z, ZodError } from "zod";
import { organizationSchema } from "../shared/domain.ts";
import { plan } from "./planner.ts";
import type { Store } from "./store.ts";
import type { Runner } from "./runner.ts";

export function createApp(store: Store, runner: Runner, assetDir: string) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (
      !["GET", "HEAD"].includes(req.method) &&
      origin &&
      origin !== `http://${req.headers.host}` &&
      origin !== `https://${req.headers.host}`
    ) {
      res.status(403).json({ error: "허용되지 않은 요청 출처입니다." });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "5mb" }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/state", (_req, res) =>
    res.json({
      ...store.read(),
      connection: {
        ready: runner.ready,
        provider: "OpenAI 호환 API",
        textModel: process.env.AI_TEXT_MODEL || "gpt-4.1-mini",
        imageModel: process.env.AI_IMAGE_MODEL || "gpt-image-1",
        videoModel: process.env.AI_VIDEO_MODEL || "sora-2",
      },
    }),
  );
  app.get("/api/organization/export", (_req, res) => {
    res.attachment("td-organization.json").json(store.read().organization);
  });
  app.post("/api/organization/import", (req, res) => {
    const organization = organizationSchema.parse(req.body);
    if (runner.active.size) {
      res
        .status(409)
        .json({ error: "업무 실행이 끝난 뒤 조직도를 교체하세요." });
      return;
    }
    store.update((state) => {
      state.organization = organization;
    });
    res.json({ ok: true });
  });
  app.put("/api/skills/:id", (req, res) => {
    const body = z
      .object({ instructions: z.string().trim().min(1).max(30000) })
      .parse(req.body);
    store.update((state) => {
      const skill = state.organization.skills.find(
        (s) => s.id === req.params.id,
      );
      if (!skill) throw new Error("skill을 찾을 수 없습니다.");
      skill.instructions = body.instructions;
    });
    res.json({ ok: true });
  });
  app.post("/api/tasks", (req, res) => {
    const task = plan(store.read().organization, req.body);
    store.update((state) => {
      state.tasks.unshift(task);
    });
    res.status(201).json(task);
  });
  app.post("/api/tasks/:id/run", (req, res) => {
    runner.start(req.params.id);
    res.status(202).json({ ok: true });
  });
  app.post("/api/tasks/:id/approve", (req, res) => {
    store.update((state) => {
      const task = state.tasks.find((t) => t.id === req.params.id);
      if (!task || task.status !== "awaiting_approval")
        throw new Error("승인 대기 중인 업무만 완료할 수 있습니다.");
      task.status = "completed";
      task.events.push({
        at: new Date().toISOString(),
        message: "대표가 최종 결과를 승인했습니다.",
      });
    });
    res.json({ ok: true });
  });
  app.get("/api/tasks/:id/artifacts/:stepId", (req, res) => {
    const step = store
      .read()
      .tasks.find((t) => t.id === req.params.id)
      ?.steps.find((s) => s.id === req.params.stepId);
    if (!step?.artifact) {
      res.status(404).json({ error: "산출물이 없습니다." });
      return;
    }
    if (step.artifact.kind === "text") {
      res
        .type("text/markdown")
        .attachment(`${step.role.id}.md`)
        .send(step.artifact.text);
      return;
    }
    res.sendFile(resolve(assetDir, step.artifact.filename!));
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "존재하지 않는 API입니다." });
  });
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof ZodError) {
        res
          .status(400)
          .json({ error: err.issues.map((i) => i.message).join(" / ") });
        return;
      }
      res.status(400).json({
        error:
          err instanceof Error ? err.message : "요청을 처리하지 못했습니다.",
      });
    },
  );
  return app;
}
