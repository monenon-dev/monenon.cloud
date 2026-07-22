import {
  Box,
  Database,
  GitBranch,
  Search,
  type LucideIcon,
} from "lucide-react";

export type ArchitectureStackItem = {
  icon: LucideIcon;
  title: string;
  blurb: string;
  tags: string[];
};

export const ARCHITECTURE_STACK: ArchitectureStackItem[] = [
  {
    icon: GitBranch,
    title: "Multi-Agent Orchestration",
    blurb:
      "LangGraph로 여러 에이전트의 역할·도구 호출 흐름을 그래프처럼 조율합니다. 브리핑·검색·리포트 에이전트가 단계별로 협업합니다.",
    tags: ["LangGraph", "Python", "FastAPI"],
  },
  {
    icon: Search,
    title: "RAG Pipeline",
    blurb:
      "업무 문서·이력을 검색·주입해 답변에 근거를 붙이는 검색 증강 생성 파이프라인입니다. 청킹·임베딩·리랭킹까지 한 흐름으로 연결됩니다.",
    tags: ["RAG", "Gemini", "KiwiPiePy"],
  },
  {
    icon: Database,
    title: "Vector + Relational DB",
    blurb:
      "PostgreSQL에서 관계형 데이터와 벡터 검색을 함께 써서 구조와 의미를 동시에 다룹니다. 사용자·세션·문서 메타는 SQL, 의미 검색은 pgvector로 처리합니다.",
    tags: ["PostgreSQL", "pgvector", "SQLAlchemy"],
  },
  {
    icon: Box,
    title: "Containerized Deployment",
    blurb:
      "Docker로 API·워커·인프라를 묶어 동일한 환경으로 배포하고 확장합니다. 로컬 개발과 프로덕션 구성을 compose로 맞춥니다.",
    tags: ["Docker", "Uvicorn", "Vercel"],
  },
];
