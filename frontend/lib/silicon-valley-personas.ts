export type TeamPersona = {
  slug: string;
  branch: string;
  displayName: string;
  role: string;
};

export const TEAM_PERSONAS: TeamPersona[] = [
  {
    slug: "richard",
    branch: "founder_richard_hendricks",
    displayName: "리처드 헨드릭스",
    role: "CEO · 중대형 손실리스 압축",
  },
  {
    slug: "erlich",
    branch: "incubator_erlich_bachman",
    displayName: "얼리크 바흐만",
    role: "인큐베이터 · Aviato",
  },
  {
    slug: "jared",
    branch: "partner_jared_dunn",
    displayName: "Jared Dunn",
    role: "COO · 오퍼레이션",
  },
  {
    slug: "dinesh",
    branch: "engineer_dinesh_chugtai",
    displayName: "디네시 축타이",
    role: "엔지니어 · ML",
  },
  {
    slug: "gilfoyle",
    branch: "architect_bertram_gilfoyle",
    displayName: "벌트람 길포일",
    role: "시스템 아키텍트",
  },
];
