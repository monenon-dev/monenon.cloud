import type {
  AgentHistoryLog,
  AgentHistoryStatus,
  AgentName,
  AgentToolName,
} from "@/lib/agent-history/types";

/** Coherent Agent–Tool–prompt–response–params bundles (do not shuffle fields across scenarios). */
type AgentHistoryScenario = {
  agentName: AgentName;
  tool: AgentToolName;
  prompt: string;
  responseSummary: string;
  toolParams: Record<string, string | number | boolean>;
};

const SCENARIOS: AgentHistoryScenario[] = [
  {
    agentName: "Mail Agent",
    tool: "email.draft",
    prompt: "고객 A에게 일정 조율 메일 초안 작성해 줘",
    responseSummary: "이메일 초안을 작성해 캘린더 일정을 반영했습니다.",
    toolParams: { to: "customerA@example.com", tone: "formal", length: "short" },
  },
  {
    agentName: "Mail Agent",
    tool: "calendar.list",
    prompt: "오늘 일정 확인해 줘",
    responseSummary: "오늘 예정된 회의 4건을 확인했습니다.",
    toolParams: { range: "today", limit: 24 },
  },
  {
    agentName: "Doc Agent",
    tool: "docs.search",
    prompt: "Q3 계획 문서에서 리스크 항목만 추려 줘",
    responseSummary: "관련 문서 8건을 묶어 우선순위 목록을 만들었습니다.",
    toolParams: { q: "Q3 plan risk", top_k: 8 },
  },
  {
    agentName: "Doc Agent",
    tool: "vector.query",
    prompt: "온보딩 FAQ 관련 문단 찾아 줘",
    responseSummary: "유사도 상위 청크를 인용과 함께 반환했습니다.",
    toolParams: { collection: "knowledge", top_k: 8, min_score: 0.72 },
  },
  {
    agentName: "Report Agent",
    tool: "report.generate",
    prompt: "이번 주 업무 리포트 만들어 줘",
    responseSummary: "진행 현황과 리스크를 정리한 리포트를 생성했습니다.",
    toolParams: { period: "week", format: "markdown", sections: 4 },
  },
  {
    agentName: "Briefing Agent",
    tool: "slack.digest",
    prompt: "슬랙 채널 요약해 줘",
    responseSummary: "3개 채널의 주요 메시지를 요약했습니다.",
    toolParams: { channels: 3, hours: 24 },
  },
  {
    agentName: "Briefing Agent",
    tool: "calendar.list",
    prompt: "오늘 오전 스탠드업 브리핑 요약해 줘",
    responseSummary: "핵심 액션 3건과 블로커 1건을 요약했습니다.",
    toolParams: { range: "morning", limit: 12 },
  },
];

const AGENTS: AgentName[] = [
  "Briefing Agent",
  "Doc Agent",
  "Report Agent",
  "Mail Agent",
];

/** deterministic 0..1 from integer seed */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function statusFor(i: number): AgentHistoryStatus {
  const r = rand(i * 17 + 3);
  if (r < 0.1) return "failed";
  if (r < 0.2) return "running";
  return "success";
}

function pickScenario(seed: number): AgentHistoryScenario {
  return SCENARIOS[Math.floor(rand(seed) * SCENARIOS.length)]!;
}

/**
 * Demo logs (~30). Scenario fields stay coherent; only time/duration/tokens vary.
 * Timestamps are relative to `baseMs`.
 */
function buildMockLogs(baseMs: number, count = 30): AgentHistoryLog[] {
  const logs: AgentHistoryLog[] = [];
  for (let i = 0; i < count; i++) {
    const scenario = pickScenario(i * 5 + 2);
    const status = statusFor(i);
    const minutesAgo = Math.floor(rand(i * 9 + 4) * 280) + i * 7;
    const timestamp = new Date(baseMs - minutesAgo * 60_000).toISOString();
    const durationMs =
      status === "running"
        ? Math.floor(rand(i * 11) * 4000) + 800
        : Math.floor(rand(i * 13) * 12000) + 900;

    logs.push({
      id: `log_${String(i + 1).padStart(3, "0")}`,
      timestamp,
      agentName: scenario.agentName,
      tool: scenario.tool,
      status,
      durationMs,
      tokens: Math.floor(rand(i * 19) * 1800) + 120,
      prompt: scenario.prompt,
      responseSummary: scenario.responseSummary,
      toolParams: { ...scenario.toolParams },
    });
  }
  return logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

const BASE_MS = Date.now();

export const MOCK_AGENT_HISTORY_LOGS: AgentHistoryLog[] = buildMockLogs(BASE_MS, 30);

/** Swap this for an API client later. */
export async function fetchAgentHistoryLogs(): Promise<AgentHistoryLog[]> {
  return MOCK_AGENT_HISTORY_LOGS;
}

export const AGENT_HISTORY_FILTER_AGENTS = AGENTS;
export const AGENT_HISTORY_FILTER_STATUSES: Array<AgentHistoryStatus | "all"> = [
  "all",
  "success",
  "running",
  "failed",
];
