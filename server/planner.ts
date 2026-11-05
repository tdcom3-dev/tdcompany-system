import { randomUUID } from "node:crypto";
import type { Category, Organization, Task } from "../shared/domain.ts";
import { requestSchema } from "../shared/domain.ts";

const matchers: Partial<Record<Category, RegExp>> = {
  image: /이미지|디자인|배너|포스터|로고|썸네일|image|design/i,
  video: /영상|동영상|릴스|쇼츠|video/i,
  development: /개발|웹|앱|코드|사이트|api|버그|프로그램|develop/i,
  operations: /운영|일정|고객|배송|정산|보고서|operation/i,
};
const order: Category[] = [
  "planning",
  "image",
  "video",
  "development",
  "operations",
  "review",
];
export function plan(org: Organization, input: unknown): Task {
  const request = requestSchema.parse(input);
  const explicit = request.roleIds?.length ? new Set(request.roleIds) : null;
  if (
    explicit &&
    [...explicit].some((id) => !org.roles.some((r) => r.id === id))
  )
    throw new Error("존재하지 않는 담당 역할입니다.");
  const content = `${request.title} ${request.brief}`;
  const selected = org.roles.filter((r) =>
    explicit
      ? explicit.has(r.id)
      : r.category === "planning" ||
        r.category === "review" ||
        matchers[r.category]?.test(content),
  );
  if (!selected.length)
    throw new Error(
      "자동 배정할 역할을 찾지 못했습니다. 담당 역할을 직접 선택하세요.",
    );
  const sorted = [...selected].sort(
    (a, b) => order.indexOf(a.category) - order.indexOf(b.category),
  );
  const steps: Task["steps"] = [];
  for (const role of sorted) {
    // Include all preceding deliverables, so review sees the complete chain.
    steps.push({
      id: randomUUID(),
      role: structuredClone(role),
      skills: org.skills
        .filter((s) => role.skillIds.includes(s.id))
        .map((s) => structuredClone(s)),
      dependsOn: steps.map((s) => s.id),
      status: "pending",
    });
  }
  return {
    id: randomUUID(),
    title: request.title,
    brief: request.brief,
    company: structuredClone(org.company),
    createdAt: new Date().toISOString(),
    status: "planned",
    steps,
    events: [
      {
        at: new Date().toISOString(),
        message: `${explicit ? "대표가 선택한 역할" : "요청 키워드에 따른 기본 배정 규칙"}으로 ${steps.length}개 단계를 계획했습니다. 실행 전에 담당 구성을 확인하세요.`,
      },
    ],
  };
}
