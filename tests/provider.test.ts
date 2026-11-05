import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createProvider } from "../server/provider.ts";
import { plan } from "../server/planner.ts";
import { seed } from "../server/seed.ts";

test("텍스트·이미지·영상 어댑터의 HTTP 요청, 산출물 저장 및 영상 작업 재사용", async () => {
  const dir = mkdtempSync(join(tmpdir(), "td-provider-"));
  const previous = {
    key: process.env.AI_API_KEY,
    base: process.env.AI_BASE_URL,
  };
  let videoCreates = 0;
  let fail = false;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks).toString();
    res.setHeader("Content-Type", "application/json");
    if (fail) {
      res.statusCode = 401;
      res.end(
        JSON.stringify({ error: "provider details must not be exposed" }),
      );
      return;
    }
    if (req.url === "/chat/completions") {
      const input = JSON.parse(body);
      assert.match(input.messages[0].content, /기획팀/);
      assert.match(input.messages[1].content, /출시/);
      res.end(
        JSON.stringify({ choices: [{ message: { content: "기획 산출물" } }] }),
      );
    } else if (req.url === "/images/generations") {
      assert.equal(JSON.parse(body).n, 1);
      res.end(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("mock-image").toString("base64") }],
        }),
      );
    } else if (req.url === "/videos" && req.method === "POST") {
      videoCreates++;
      assert.match(body, /720x1280/);
      res.end(JSON.stringify({ id: "video_test" }));
    } else if (req.url === "/videos/video_test")
      res.end(JSON.stringify({ status: "completed" }));
    else if (req.url === "/videos/video_test/content") {
      res.setHeader("Content-Type", "video/mp4");
      res.end("mock-video");
    } else {
      res.statusCode = 404;
      res.end("{}");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const addr = server.address();
  assert.ok(addr && typeof addr !== "string");
  try {
    process.env.AI_API_KEY = "test-only-placeholder";
    process.env.AI_BASE_URL = `http://127.0.0.1:${addr.port}`;
    const provider = createProvider(dir);
    const task = plan(seed, {
      title: "출시 콘텐츠",
      brief: "출시 배너 이미지와 소개 영상을 제작해 주세요.",
    });
    const text = await provider.execute(task, task.steps[0], () => {});
    assert.equal(text.text, "기획 산출물");
    const img = await provider.execute(
      task,
      task.steps.find((s) => s.role.category === "image")!,
      () => {},
    );
    assert.equal(img.kind, "image");
    assert.equal(readFileSync(join(dir, img.filename!), "utf8"), "mock-image");
    const step = task.steps.find((s) => s.role.category === "video")!;
    const video = await provider.execute(task, step, (id) => {
      step.remoteId = id;
    });
    assert.equal(video.kind, "video");
    assert.equal(
      readFileSync(join(dir, video.filename!), "utf8"),
      "mock-video",
    );
    await provider.execute(task, step, () => {});
    assert.equal(videoCreates, 1);
    fail = true;
    await assert.rejects(
      () => provider.execute(task, task.steps[0], () => {}),
      /HTTP 401/,
    );
  } finally {
    if (previous.key === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previous.key;
    if (previous.base === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = previous.base;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true });
  }
});
