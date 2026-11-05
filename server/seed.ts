import type { Organization, Category } from "../shared/domain.ts";
const entries: [Category, string, string][] = [
  [
    "planning",
    "기획팀",
    "요청의 목적, 대상, 산출물, 제약 조건을 정리하고 실행 가능한 기획안을 작성한다. 불명확한 내용은 가정으로 명시한다.",
  ],
  [
    "image",
    "디자인팀",
    "기획과 브랜드 맥락에 맞는 이미지를 제작한다. 이전 단계 결과를 반영하고 과도한 문구 삽입을 피한다.",
  ],
  [
    "video",
    "영상팀",
    "기획에 맞는 짧은 영상을 제작한다. 장면, 움직임, 구도와 분위기를 구체적으로 구성한다.",
  ],
  [
    "development",
    "개발팀",
    "요구사항을 구현할 설계, 코드 초안, 검증 방법을 작성한다. 실제 실행하지 않은 코드는 검증 완료로 표현하지 않는다.",
  ],
  [
    "operations",
    "운영팀",
    "담당자, 일정, 실행 절차, 점검 항목이 포함된 운영안을 작성한다.",
  ],
  [
    "review",
    "검수팀",
    "원래 요청과 모든 전달 산출물을 대조한다. 충족 여부와 수정 항목을 작성한다. 직접 볼 수 없는 이미지나 영상은 시각 검수 미완료로 명시하고 대표 확인을 요청한다.",
  ],
];
export const seed: Organization = {
  version: 1,
  company: {
    name: "TD Company",
    description:
      "분석 결과 도착 전 사용하는 예시 조직입니다. 실제 회사 정보로 교체하세요.",
  },
  roles: entries.map(([category, name]) => ({
    id: category,
    category,
    name,
    description: `${name} 역할 봇`,
    reportsTo: null,
    skillIds: [`${category}-default`],
  })),
  skills: entries.map(([category, name, instructions]) => ({
    id: `${category}-default`,
    name: `${name} 기본 skill`,
    instructions,
  })),
};
