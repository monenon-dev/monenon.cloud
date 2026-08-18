import {
  Box,
  Database,
  GitBranch,
  Search,
  Shield,
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
      "LangGraph로 8개 노드가 순서대로 실행됩니다. router → calendar → docs → history → slack → gmail → synthesizer → validator 순으로 데이터를 수집·합성하고, validator가 근거 없는 내용을 걸러냅니다. 검증 실패 시 synthesizer로 최대 2회 재호출해 스스로 다시 다듬습니다.",
    tags: ["LangGraph", "Python", "FastAPI", "APScheduler", "Gemini", "Slack SDK", "Google API"],
  },
  {
    icon: Search,
    title: "RAG Pipeline",
    blurb:
      "DB 행을 텍스트 청크로 변환 후 Ollama(nomic-embed-text)로 1024차원 임베딩을 생성하고 pgvector에 저장합니다. 질문 임베딩과의 코사인 거리로 top-k 청크를 검색한 뒤 Gemini가 답변을 생성합니다. 리랭킹은 미적용입니다.",
    tags: ["pgvector", "Ollama", "nomic-embed-text", "Gemini", "PostgreSQL"],
  },
  {
    icon: Database,
    title: "Vector + Relational DB",
    blurb:
      "PostgreSQL 하나에서 관계형 데이터(SQLAlchemy ORM)와 1024차원 벡터 검색(pgvector ivfflat)을 함께 사용합니다. star_craft 앱은 Neo4j로 허브 온톨로지 그래프를 별도 관리합니다.",
    tags: ["PostgreSQL", "pgvector", "SQLAlchemy", "Neo4j", "neo4j-graphrag"],
  },
  {
    icon: Box,
    title: "Containerized Deployment",
    blurb:
      "로컬은 docker-compose로 API·auth·pgvector·redis·neo4j·ollama 등 9개 서비스를 한 번에 올립니다. 프로덕션은 백엔드를 Railway(Procfile → uvicorn), 프론트엔드를 Vercel(Next.js)에 분리 배포합니다. APScheduler가 API 프로세스 안에서 브리핑·알림 작업을 실행합니다.",
    tags: ["Docker", "Railway", "Vercel", "Uvicorn", "APScheduler"],
  },
  {
    icon: Shield,
    title: "Authentication & Session",
    blurb:
      "카카오·네이버·구글 OAuth 또는 이메일 로그인 후 RS256 JWT Access Token(기본 10분)과 Refresh Token(기본 14일)을 발급합니다. Access Token은 프론트 메모리와 Authorization Bearer로 전달되고, Refresh Token은 httpOnly 쿠키(monenon_refresh, path=/auth)와 Redis에 jti로 저장·rotation됩니다. API는 FastAPI Depends(get_current_user)로 매 요청 검증하며, 401 시 프론트 api-client가 single-flight로 /auth/refresh를 호출해 재발급합니다. refresh 재사용·만료 시 세션 전체 폐기 후 재로그인을 요구합니다.",
    tags: [
      "JWT (RS256)",
      "FastAPI",
      "Redis",
      "httpOnly Cookie",
      "OAuth (Kakao)",
      "Bearer Token",
    ],
  },
];
