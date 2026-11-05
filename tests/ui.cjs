// Run after npm run build. Uses a temporary database and never calls a paid AI API.
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync, readFileSync, existsSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const assert = require("node:assert/strict");
const { once } = require("node:events");
(async () => {
  const dir = mkdtempSync(join(tmpdir(), "td-ui-"));
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      env: { ...process.env, DATA_DIR: dir, PORT: "3311", AI_API_KEY: "" },
      stdio: "pipe",
    },
  );
  let browser;
  try {
    await Promise.race([
      once(child.stdout, "data"),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Server startup timed out")),
          10000,
        ).unref(),
      ),
    ]);
    const executablePath =
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
    browser = await chromium.launch({
      headless: true,
      channel: "chromium",
      executablePath,
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:3311");
    await page.getByRole("heading", { name: /대표님의 생각/ }).waitFor();
    await page.screenshot({
      path: "/tmp/td-company-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "새 업무 요청", exact: true })
      .click();
    await page.getByLabel("업무 제목").fill("브라우저 검증: 출시 배너");
    await page
      .getByLabel("업무 브리프")
      .fill(
        "새로운 서비스 출시에 필요한 배너 이미지를 기획하고 제작해 주세요.",
      );
    await page.getByRole("button", { name: "실행 계획 만들기" }).click();
    await page
      .getByRole("heading", { name: "브라우저 검증: 출시 배너" })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "계획 확인 · 실행" }).isDisabled(),
      true,
    );
    await page.reload();
    await page
      .getByRole("button", { name: /브라우저 검증: 출시 배너/ })
      .waitFor();
    await page.getByRole("button", { name: "조직도", exact: true }).click();
    const org = JSON.parse(readFileSync("examples/organization.json", "utf8"));
    org.company.name = "브라우저 테스트 회사";
    await page.locator("input[type=file]").setInputFiles({
      name: "org.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(org)),
    });
    await page
      .getByRole("status")
      .filter({ hasText: "조직도와 skills를 가져왔습니다" })
      .waitFor();
    await page.getByRole("button", { name: /Skills 라이브러리/ }).click();
    await page
      .getByRole("button", { name: "기획팀 기본 skill 기획팀" })
      .click();
    await page
      .getByLabel("Skill 지침")
      .fill("# 테스트 지침\n요청 목표와 검수 기준을 정리한다.");
    await page.getByRole("button", { name: "지침 저장" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Skill 지침을 저장했습니다" })
      .waitFor();
    await page.reload();
    await page.getByRole("button", { name: /Skills 라이브러리/ }).click();
    await page
      .getByRole("button", { name: "기획팀 기본 skill 기획팀" })
      .click();
    assert.match(
      await page.getByLabel("Skill 지침").inputValue(),
      /테스트 지침/,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "대표 업무실", exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "mobile layout must not overflow",
    );
    await page.screenshot({
      path: "/tmp/td-company-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "UI PASS: task creation, disabled unconfigured execution, persistence, organization import, skill save, mobile layout; zero browser errors.",
    );
  } finally {
    await browser?.close();
    const exited = once(child, "exit");
    child.kill();
    await exited;
    rmSync(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
