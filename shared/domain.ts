import { z } from "zod";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const categorySchema = z.enum([
  "planning",
  "image",
  "video",
  "review",
  "development",
  "operations",
]);
export const labels: Record<Category, string> = {
  planning: "기획",
  image: "이미지 제작",
  video: "영상 제작",
  review: "검수",
  development: "개발",
  operations: "운영",
};
export type Category = z.infer<typeof categorySchema>;
const skillSchema = z.object({
  id,
  name: z.string().min(1).max(120),
  instructions: z.string().min(1).max(30000),
});
const roleSchema = z.object({
  id,
  name: z.string().min(1).max(120),
  category: categorySchema,
  description: z.string().max(1000),
  reportsTo: id.nullable(),
  skillIds: z.array(id).min(1).max(20),
});
export const organizationSchema = z
  .object({
    version: z.literal(1),
    company: z.object({
      name: z.string().min(1).max(120),
      description: z.string().max(3000),
    }),
    roles: z.array(roleSchema).min(1).max(100),
    skills: z.array(skillSchema).min(1).max(200),
  })
  .superRefine((org, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const roles = new Map(org.roles.map((r) => [r.id, r]));
    const skills = new Set(org.skills.map((s) => s.id));
    if (roles.size !== org.roles.length || skills.size !== org.skills.length)
      fail("역할과 skill ID는 각각 고유해야 합니다.");
    for (const r of org.roles) {
      if (r.skillIds.some((s) => !skills.has(s)))
        fail(`${r.name}: 존재하지 않는 skill입니다.`);
      const seen = new Set([r.id]);
      let parent = r.reportsTo;
      while (parent) {
        if (!roles.has(parent)) {
          fail(`${r.name}: 상위 역할을 찾을 수 없습니다.`);
          break;
        }
        if (seen.has(parent)) {
          fail("조직도에 순환 관계가 있습니다.");
          break;
        }
        seen.add(parent);
        parent = roles.get(parent)!.reportsTo;
      }
    }
  });
export type Organization = z.infer<typeof organizationSchema>;
export type Role = Organization["roles"][number];
export type Skill = Organization["skills"][number];
export type Artifact = {
  kind: "text" | "image" | "video";
  text?: string;
  filename?: string;
  mime?: string;
};
export type Step = {
  id: string;
  role: Role;
  skills: Skill[];
  dependsOn: string[];
  status: "pending" | "running" | "succeeded" | "failed";
  artifact?: Artifact;
  error?: string;
  remoteId?: string;
};
export type Task = {
  id: string;
  title: string;
  brief: string;
  company: Organization["company"];
  createdAt: string;
  status: "planned" | "running" | "failed" | "awaiting_approval" | "completed";
  steps: Step[];
  events: { at: string; message: string }[];
};
export type State = { organization: Organization; tasks: Task[] };
export const requestSchema = z.object({
  title: z.string().trim().min(1).max(120),
  brief: z.string().trim().min(10).max(12000),
  roleIds: z.array(id).max(100).optional(),
});
