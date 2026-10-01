/** 개인 프로젝트 목록 — `/projects` 페이지가 이 배열만 보고 카드를 그린다. 새 프로젝트는 여기 한 줄 추가. */
export type ProjectStatus = "live" | "preparing";

export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  name: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  tags: string[];
  /** 준비 중인 프로젝트는 비워 둔다. */
  links: ProjectLink[];
  /** 카드 왼쪽 위 원형 프로필 이미지(public 기준 경로). 없으면 이름 첫 글자를 보여 준다. */
  avatar?: string;
  /** 프로필 원의 강조 색(프로젝트 브랜드 색). */
  accent?: string;
};

export const PROJECTS: Project[] = [
  {
    name: "PUMSAE",
    summary: "태권도장 운영 관리",
    description:
      "도장 홈페이지·체험 신청·일정·사진첩·카드뉴스를 웹과 모바일 앱 하나로 관리해요.",
    status: "live",
    tags: ["Next.js", "FastAPI", "Flutter"],
    avatar: "/images/projects/pumsae-avatar.webp",
    accent: "#B4222E",
    links: [
      { label: "웹 열기", href: "https://pumsae.vercel.app" },
      { label: "GitHub", href: "https://github.com/monenon-dev/pumsae" },
    ],
  },
  {
    name: "kidslog",
    summary: "새로 시작하는 프로젝트",
    description: "준비 중이에요. 공개되면 이곳에서 바로 열 수 있어요.",
    status: "preparing",
    tags: [],
    links: [],
  },
];
