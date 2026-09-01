import type { ToolCallResult } from "@/components/home/tool-stream";

/** LangGraph-style node ids — swap when wiring live traces. */
export type TraceNodeId =
  | "router"
  | "calendar"
  | "docs"
  | "slack"
  | "report"
  | "synthesizer";

export type TraceNodeStatus = "idle" | "active" | "done";

export type TraceNodeDef = {
  id: TraceNodeId;
  label: string;
  description: string;
  /** Layout hint for SVG graph */
  column: 0 | 1 | 2;
  row: number;
};

export type TraceEdge = { from: TraceNodeId; to: TraceNodeId };

export type RagCitation = {
  id: string;
  title: string;
  preview: string;
  score: number;
  fullText: string;
  sourceUrl?: string;
};

export type DelegationStep = {
  id: string;
  label: string;
  summary: string;
};

export type ScenarioToolFixture = Omit<ToolCallResult, "id" | "timestamp"> & {
  /** Stable id within a scenario timeline */
  callId: string;
  /** Node to highlight when this tool appears / resolves */
  activateNode?: TraceNodeId;
  /** Mark node done after this tool succeeds */
  completeNode?: TraceNodeId;
};

/**
 * Timeline events — replace with streamed API events later.
 * `atMs` is offset from scenario start (absolute timeline).
 */
export type ScenarioEvent =
  | { atMs: number; type: "user_message"; text: string }
  | { atMs: number; type: "thinking"; show: boolean }
  | {
      atMs: number;
      type: "tool_spawn";
      tool: ScenarioToolFixture;
    }
  | {
      atMs: number;
      type: "tool_patch";
      callId: string;
      patch: Partial<Pick<ToolCallResult, "status" | "params" | "result" | "error">>;
      activateNode?: TraceNodeId;
      completeNode?: TraceNodeId;
    }
  | {
      atMs: number;
      type: "agent_message";
      text: string;
      delegation?: DelegationStep[];
      citations?: RagCitation[];
    }
  | { atMs: number; type: "complete" };

export type ScenarioCategory = "briefing" | "docs" | "report";

export type DemoScenario = {
  id: string;
  category: ScenarioCategory;
  tabLabel: string;
  title: string;
  description: string;
  userPrompt: string;
  nodes: TraceNodeDef[];
  edges: TraceEdge[];
  events: ScenarioEvent[];
};

const DEFAULT_NODES: TraceNodeDef[] = [
  {
    id: "router",
    label: "Router",
    description: "의도 분류 후 전문 에이전트로 라우팅합니다.",
    column: 0,
    row: 1,
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "일정·미팅 컨텍스트를 수집합니다.",
    column: 1,
    row: 0,
  },
  {
    id: "docs",
    label: "Docs",
    description: "문서 검색·벡터 조회를 수행합니다.",
    column: 1,
    row: 1,
  },
  {
    id: "slack",
    label: "Slack",
    description: "채널 다이제스트를 요약합니다.",
    column: 1,
    row: 2,
  },
  {
    id: "report",
    label: "Report",
    description: "수집된 근거로 리포트 초안을 작성합니다.",
    column: 1,
    row: 3,
  },
  {
    id: "synthesizer",
    label: "Synthesizer",
    description: "에이전트 출력을 하나의 답변으로 합성합니다.",
    column: 2,
    row: 1,
  },
];

const BRIEFING_EDGES: TraceEdge[] = [
  { from: "router", to: "calendar" },
  { from: "router", to: "docs" },
  { from: "calendar", to: "synthesizer" },
  { from: "docs", to: "synthesizer" },
];

const DOCS_EDGES: TraceEdge[] = [
  { from: "router", to: "docs" },
  { from: "docs", to: "synthesizer" },
];

const REPORT_EDGES: TraceEdge[] = [
  { from: "router", to: "calendar" },
  { from: "router", to: "docs" },
  { from: "router", to: "slack" },
  { from: "calendar", to: "report" },
  { from: "docs", to: "report" },
  { from: "slack", to: "report" },
  { from: "report", to: "synthesizer" },
];

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "standup-briefing",
    category: "briefing",
    tabLabel: "업무 브리핑",
    title: "오전 스탠드업 브리핑",
    description: "캘린더와 문서를 모아 액션 아이템을 정리합니다.",
    userPrompt: "오늘 오전 스탠드업 브리핑 요약해 줘",
    nodes: DEFAULT_NODES.filter((n) => !["report", "slack"].includes(n.id)),
    edges: BRIEFING_EDGES,
    events: [
      { atMs: 0, type: "user_message", text: "오늘 오전 스탠드업 브리핑 요약해 줘" },
      { atMs: 900, type: "thinking", show: true },
      {
        atMs: 1400,
        type: "tool_spawn",
        tool: {
          callId: "cal-1",
          toolName: "calendar.list",
          status: "pending",
          params: { range: "today", meetings: 4 },
          activateNode: "router",
        },
      },
      {
        atMs: 2200,
        type: "tool_patch",
        callId: "cal-1",
        activateNode: "calendar",
        completeNode: "calendar",
        patch: {
          status: "success",
          result: {
            type: "list",
            items: [
              { title: "Standup · Core", meta: "09:30" },
              { title: "Design sync", meta: "10:15" },
              { title: "Investor prep", meta: "11:00" },
              { title: "Lunch / buffer", meta: "12:30" },
            ],
          },
        },
      },
      {
        atMs: 2800,
        type: "tool_spawn",
        tool: {
          callId: "slack-1",
          toolName: "slack.digest",
          status: "pending",
          params: { channels: 3, since: "08:00" },
          activateNode: "slack",
        },
      },
      {
        atMs: 3600,
        type: "tool_patch",
        callId: "slack-1",
        completeNode: "slack",
        patch: {
          status: "success",
          result: {
            type: "list",
            items: [
              { title: "#ops-alerts", meta: "14 msgs" },
              { title: "#product", meta: "6 msgs" },
              { title: "#moneo-agent", meta: "9 msgs" },
            ],
          },
        },
      },
      {
        atMs: 4200,
        type: "tool_spawn",
        tool: {
          callId: "docs-1",
          toolName: "docs.search",
          status: "pending",
          params: { q: "standup brief", top_k: 5 },
          activateNode: "docs",
        },
      },
      {
        atMs: 5200,
        type: "tool_patch",
        callId: "docs-1",
        completeNode: "docs",
        patch: {
          status: "success",
          params: { q: "standup brief", hits: 3 },
          result: {
            type: "rag",
            items: [
              {
                title: "standup-template.md",
                preview: "Agenda · blockers · owners — keep under 8 min.",
                score: 0.91,
              },
              {
                title: "q3-roadmap.md",
                preview:
                  "North-star: reduce time-to-brief for ops agents under 45s…",
                score: 0.74,
              },
              {
                title: "archive/old-okr.md",
                preview: "Legacy OKR draft — mostly superseded.",
                score: 0.41,
              },
            ],
          },
        },
      },
      {
        atMs: 5800,
        type: "thinking",
        show: false,
      },
      {
        atMs: 6000,
        type: "agent_message",
        text: "오전 스탠드업 기준으로 **액션 아이템 3건**과 **리스크 1건**을 정리했습니다.\n\n## 일정\n- 09:30 Standup · Core\n- 10:15 Design sync\n- 11:00 Investor prep\n\n## 액션\n1. SLA 드리프트 체크 (ops)\n2. Q3 브리핑 초안 공유\n3. Design sync 후 스펙 반영\n\n## 리스크\n- vendor calendar sync 지연 가능성",
        delegation: [
          {
            id: "d-cal",
            label: "캘린더 에이전트",
            summary: "오늘 오전 미팅 4건을 타임라인으로 추출",
          },
          {
            id: "d-slack",
            label: "Slack 에이전트",
            summary: "#ops-alerts 등 3채널 다이제스트 요약",
          },
          {
            id: "d-docs",
            label: "문서 에이전트",
            summary: "스탠드업 템플릿·로드맵 근거 3건 인용",
          },
        ],
        citations: [
          {
            id: "c1",
            title: "standup-template.md",
            preview: "Agenda · blockers · owners — keep under 8 min.",
            score: 0.91,
            fullText:
              "# Standup template\n\nAgenda · blockers · owners — keep under 8 min.\n1) Yesterday 2) Today 3) Blockers\nOwners must be named before closing.",
          },
          {
            id: "c2",
            title: "q3-roadmap.md",
            preview:
              "North-star: reduce time-to-brief for ops agents under 45s…",
            score: 0.74,
            fullText:
              "# Q3 Roadmap\n\nNorth-star: reduce time-to-brief for ops agents under 45s.\nRisk: vendor SLA drift on calendar sync path.",
          },
          {
            id: "c3",
            title: "archive/old-okr.md",
            preview: "Legacy OKR draft — mostly superseded.",
            score: 0.41,
            fullText:
              "# Legacy OKR\n\nMostly superseded by q3-roadmap. Kept for audit only.",
          },
        ],
      },
      { atMs: 6200, type: "complete" },
    ],
  },
  {
    id: "docs-organize",
    category: "docs",
    tabLabel: "문서 정리",
    title: "문서·자료 주제별 정리",
    description: "검색과 벡터 조회로 흩어진 자료를 묶습니다. (재시도 포함)",
    userPrompt: "흩어진 문서와 자료를 주제별로 정리해 줘",
    nodes: DEFAULT_NODES.filter((n) =>
      ["router", "docs", "synthesizer"].includes(n.id)
    ),
    edges: DOCS_EDGES,
    events: [
      {
        atMs: 0,
        type: "user_message",
        text: "흩어진 문서와 자료를 주제별로 정리해 줘",
      },
      { atMs: 800, type: "thinking", show: true },
      {
        atMs: 1300,
        type: "tool_spawn",
        tool: {
          callId: "docs-2",
          toolName: "docs.search",
          status: "pending",
          params: { q: "topic cluster", top_k: 8 },
          activateNode: "router",
        },
      },
      {
        atMs: 2200,
        type: "tool_patch",
        callId: "docs-2",
        activateNode: "docs",
        patch: {
          status: "success",
          params: { q: "topic cluster", hits: 5 },
          result: {
            type: "rag",
            items: [
              {
                title: "notes/product-sync.md",
                preview: "스펙 드리프트 · 우선순위 P0/P1 정리…",
                score: 0.88,
              },
              {
                title: "research/competitor.md",
                preview: "에이전트 UX 벤치마크 메모",
                score: 0.71,
              },
              {
                title: "scratch/meeting-dump.txt",
                preview: "임시 메모 — 주제 미분류",
                score: 0.39,
              },
            ],
          },
        },
      },
      {
        atMs: 2800,
        type: "tool_spawn",
        tool: {
          callId: "vec-1",
          toolName: "vector.query",
          status: "pending",
          params: { top_k: 8, collection: "ops_docs" },
          activateNode: "docs",
        },
      },
      {
        atMs: 4000,
        type: "tool_patch",
        callId: "vec-1",
        patch: {
          status: "error",
          error: {
            code: "VECTOR_TIMEOUT",
            message: "Timed out waiting for embedding index (ops_docs).",
          },
        },
      },
      {
        atMs: 4800,
        type: "tool_spawn",
        tool: {
          callId: "vec-2",
          toolName: "vector.query",
          status: "pending",
          params: { top_k: 8, collection: "ops_docs", retry: 1 },
          activateNode: "docs",
        },
      },
      {
        atMs: 6000,
        type: "tool_patch",
        callId: "vec-2",
        completeNode: "docs",
        patch: {
          status: "success",
          result: {
            type: "rag",
            items: [
              {
                title: "clusters/ops-alerts.md",
                preview: "인시던트 대응 런북 청크…",
                score: 0.86,
              },
              {
                title: "clusters/product-ux.md",
                preview: "에이전트 채팅 UX 가이드",
                score: 0.79,
              },
              {
                title: "noise/wiki-dump.md",
                preview: "Unrelated wiki dump — low relevance.",
                score: 0.32,
              },
            ],
          },
        },
      },
      { atMs: 6600, type: "thinking", show: false },
      {
        atMs: 6800,
        type: "agent_message",
        text: "자료를 **3개 주제 클러스터**로 묶었습니다.\n\n## 1. Ops / 인시던트\n- clusters/ops-alerts.md\n\n## 2. Product UX\n- research/competitor.md\n- clusters/product-ux.md\n\n## 3. 미분류·노이즈\n- scratch/meeting-dump.txt (점수 낮음)\n\n벡터 인덱스가 한 번 타임아웃된 뒤 재시도로 복구했습니다.",
        delegation: [
          {
            id: "d-docs",
            label: "문서정리 에이전트",
            summary: "docs.search + vector.query(재시도)로 클러스터 구성",
          },
        ],
        citations: [
          {
            id: "d1",
            title: "notes/product-sync.md",
            preview: "스펙 드리프트 · 우선순위 P0/P1 정리…",
            score: 0.88,
            fullText:
              "# Product sync\n\n스펙 드리프트 · 우선순위 P0/P1 정리.\nOwner: product · Due: Fri",
          },
          {
            id: "d2",
            title: "clusters/ops-alerts.md",
            preview: "인시던트 대응 런북 청크…",
            score: 0.86,
            fullText:
              "# Ops alerts cluster\n\n인시던트 대응 런북. Severity → owner → SLA.",
          },
          {
            id: "d3",
            title: "noise/wiki-dump.md",
            preview: "Unrelated wiki dump — low relevance.",
            score: 0.32,
            fullText: "# Wiki dump\n\nUnrelated content — filtered below 0.5.",
          },
        ],
      },
      { atMs: 7000, type: "complete" },
    ],
  },
  {
    id: "weekly-report",
    category: "report",
    tabLabel: "리포트 생성",
    title: "이번 주 업무 리포트",
    description: "일정·문서·Slack을 순차 수집한 뒤 Report 에이전트가 종합합니다.",
    userPrompt: "이번 주 업무 리포트 만들어 줘",
    nodes: DEFAULT_NODES,
    edges: REPORT_EDGES,
    events: [
      { atMs: 0, type: "user_message", text: "이번 주 업무 리포트 만들어 줘" },
      { atMs: 900, type: "thinking", show: true },
      {
        atMs: 1400,
        type: "tool_spawn",
        tool: {
          callId: "cal-w",
          toolName: "calendar.list",
          status: "pending",
          params: { range: "this_week" },
          activateNode: "router",
        },
      },
      {
        atMs: 2300,
        type: "tool_patch",
        callId: "cal-w",
        activateNode: "calendar",
        completeNode: "calendar",
        patch: {
          status: "success",
          result: {
            type: "list",
            items: [
              { title: "Mon · Planning", meta: "4 events" },
              { title: "Wed · Demo review", meta: "2 events" },
              { title: "Fri · Retro", meta: "1 event" },
            ],
          },
        },
      },
      {
        atMs: 2900,
        type: "tool_spawn",
        tool: {
          callId: "docs-w",
          toolName: "docs.search",
          status: "pending",
          params: { q: "weekly progress", top_k: 5 },
          activateNode: "docs",
        },
      },
      {
        atMs: 4000,
        type: "tool_patch",
        callId: "docs-w",
        completeNode: "docs",
        patch: {
          status: "success",
          result: {
            type: "rag",
            items: [
              {
                title: "reports/week-24.md",
                preview: "진행 68% · 블로커: 임베딩 지연…",
                score: 0.93,
              },
              {
                title: "metrics/kpi.csv",
                preview: "TTB p50=52s → target 45s",
                score: 0.67,
              },
              {
                title: "old/week-12.md",
                preview: "지난 분기 초안",
                score: 0.28,
              },
            ],
          },
        },
      },
      {
        atMs: 4600,
        type: "tool_spawn",
        tool: {
          callId: "slack-w",
          toolName: "slack.digest",
          status: "pending",
          params: { channels: 4, since: "Mon" },
          activateNode: "slack",
        },
      },
      {
        atMs: 5600,
        type: "tool_patch",
        callId: "slack-w",
        completeNode: "slack",
        patch: {
          status: "success",
          result: {
            type: "list",
            items: [
              { title: "#product", meta: "22 msgs" },
              { title: "#ops-alerts", meta: "9 msgs" },
              { title: "#moneo-agent", meta: "15 msgs" },
            ],
          },
        },
      },
      {
        atMs: 6200,
        type: "tool_spawn",
        tool: {
          callId: "report-1",
          toolName: "report.compose",
          status: "pending",
          params: { template: "weekly", sections: 4 },
          activateNode: "report",
        },
      },
      {
        atMs: 7600,
        type: "tool_patch",
        callId: "report-1",
        completeNode: "report",
        patch: {
          status: "success",
          result: {
            type: "draft",
            items: [
              {
                title: "Weekly ops report · W24",
                meta: "team@moneo.ai",
                preview:
                  "진행 현황 · 리스크 · 다음 액션을 1페이지로 정리한 초안입니다.",
              },
            ],
          },
        },
      },
      { atMs: 8200, type: "thinking", show: false },
      {
        atMs: 8400,
        type: "agent_message",
        text: "## 이번 주 업무 리포트 (초안)\n\n### 진행 현황\n- 전체 진행률 **68%**\n- TTB p50 52s (목표 45s)\n\n### 리스크\n- 임베딩 인덱스 지연 → 벡터 재시도 경로 확인\n\n### 다음 액션\n1. Demo review 피드백 반영\n2. Retro에서 SLA 드리프트 논의\n3. 리포트 초안 공유 (team@moneo.ai)",
        delegation: [
          {
            id: "s-brief",
            label: "브리핑 에이전트",
            summary: "주간 일정·미팅 밀도 요약",
          },
          {
            id: "s-docs",
            label: "문서정리 에이전트",
            summary: "week-24 진행 메모·KPI 인용",
          },
          {
            id: "s-report",
            label: "리포트 에이전트",
            summary: "진행·리스크·액션 1페이지 초안 작성",
          },
        ],
        citations: [
          {
            id: "r1",
            title: "reports/week-24.md",
            preview: "진행 68% · 블로커: 임베딩 지연…",
            score: 0.93,
            fullText:
              "# Week 24\n\n진행 68% · 블로커: 임베딩 지연.\nNext: shorten vector cold-start.",
          },
          {
            id: "r2",
            title: "metrics/kpi.csv",
            preview: "TTB p50=52s → target 45s",
            score: 0.67,
            fullText: "metric,value,target\nTTB_p50,52,45\nbrief_count,128,150",
          },
        ],
      },
      { atMs: 8600, type: "complete" },
    ],
  },
];

export function getScenarioById(id: string): DemoScenario {
  return DEMO_SCENARIOS.find((s) => s.id === id) ?? DEMO_SCENARIOS[0]!;
}
