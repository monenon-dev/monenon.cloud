import type {
  AgentHistoryLog,
  AgentHistoryStatus,
  AgentName,
  AgentToolName,
} from "@/lib/agent-history/types";

/** One coherent run — never mix fields across scenarios. */
export type AgentHistoryScenario = {
  agentName: AgentName;
  tool: AgentToolName;
  prompt: string;
  responseSummary: string;
  toolParams: Record<string, string | number | boolean>;
};

/**
 * Canonical scenarios. Recent-activity timeline uses these in order (newest first).
 * Table rows reuse the same sets with varied time/duration/tokens only.
 */
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
  {
    agentName: "Report Agent",
    tool: "docs.search",
    prompt: "지난주 리포트에 인용할 지표 문서 찾아 줘",
    responseSummary: "지표 문서 5건을 찾아 리포트 초안에 연결했습니다.",
    toolParams: { q: "weekly KPI", top_k: 5 },
  },
  {
    agentName: "Mail Agent",
    tool: "email.draft",
    prompt: "파트너사에 Kick-off 일정 안내 메일 써 줘",
    responseSummary: "Kick-off 안내 메일 초안과 제목 후보를 작성했습니다.",
    toolParams: { to: "partner@example.com", tone: "friendly", length: "medium" },
  },
  {
    agentName: "Doc Agent",
    tool: "vector.query",
    prompt: "보안 정책 PDF에서 MFA 관련 조항 찾아 줘",
    responseSummary: "MFA 관련 조항 청크 3건을 인용과 함께 반환했습니다.",
    toolParams: { collection: "policies", top_k: 3, min_score: 0.78 },
  },
];

const AGENTS: AgentName[] = [
  "Briefing Agent",
  "Doc Agent",
  "Report Agent",
  "Mail Agent",
];

function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function statusForIndex(i: number): AgentHistoryStatus {
  // Fixed pattern: mostly success; predictable failed/running slots
  if (i === 4 || i === 18) return "failed";
  if (i === 2 || i === 11 || i === 25) return "running";
  return "success";
}

function responseFor(
  scenario: AgentHistoryScenario,
  status: AgentHistoryStatus
): string {
  if (status === "running") {
    return `${scenario.tool} 실행 중 — 요청을 처리하고 있습니다.`;
  }
  if (status === "failed") {
    return `${scenario.tool} 실패 — 요청을 완료하지 못했습니다.`;
  }
  return scenario.responseSummary;
}

function buildLog(
  scenario: AgentHistoryScenario,
  opts: {
    id: string;
    timestamp: string;
    status: AgentHistoryStatus;
    durationMs: number;
    tokens: number;
  }
): AgentHistoryLog {
  return {
    id: opts.id,
    timestamp: opts.timestamp,
    agentName: scenario.agentName,
    tool: scenario.tool,
    status: opts.status,
    durationMs: opts.durationMs,
    tokens: opts.tokens,
    prompt: scenario.prompt,
    responseSummary: responseFor(scenario, opts.status),
    toolParams: { ...scenario.toolParams },
  };
}

/**
 * Recent-activity feed: fixed order of complete scenarios (newest first).
 * Field bundles never shuffle.
 */
function buildRecentLogs(baseMs: number): AgentHistoryLog[] {
  return SCENARIOS.map((scenario, i) => {
    const status = statusForIndex(i);
    const minutesAgo = 8 + i * 14;
    return buildLog(scenario, {
      id: `recent_${String(i + 1).padStart(2, "0")}`,
      timestamp: new Date(baseMs - minutesAgo * 60_000).toISOString(),
      status,
      durationMs:
        status === "running"
          ? 1200 + i * 180
          : status === "failed"
            ? 800 + i * 90
            : 1500 + i * 420,
      tokens: 200 + i * 95,
    });
  });
}

/** Extra table rows: cycle the same coherent scenarios. */
function buildExtraLogs(baseMs: number, count: number): AgentHistoryLog[] {
  const logs: AgentHistoryLog[] = [];
  for (let i = 0; i < count; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length]!;
    const status = statusForIndex(i + SCENARIOS.length);
    const minutesAgo = 160 + i * 11 + Math.floor(rand(i * 9) * 20);
    logs.push(
      buildLog(scenario, {
        id: `log_${String(i + 1).padStart(3, "0")}`,
        timestamp: new Date(baseMs - minutesAgo * 60_000).toISOString(),
        status,
        durationMs:
          status === "running"
            ? Math.floor(rand(i * 11) * 4000) + 800
            : Math.floor(rand(i * 13) * 12000) + 900,
        tokens: Math.floor(rand(i * 19) * 1800) + 120,
      })
    );
  }
  return logs;
}

function buildInitialAgentHistoryLogs(): AgentHistoryLog[] {
  const baseMs = Date.now();
  const recent = buildRecentLogs(baseMs);
  const extra = buildExtraLogs(baseMs, 40);
  return [...recent, ...extra].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/** Initial snapshot for mock live store + static fixtures. */
export { buildInitialAgentHistoryLogs };
export { SCENARIOS };

const BASE_MS = Date.now();

const RECENT = buildRecentLogs(BASE_MS);
const EXTRA = buildExtraLogs(BASE_MS, 20);

/** Newest first; recent activity = first 10 (full scenario set). */
export const MOCK_AGENT_HISTORY_LOGS: AgentHistoryLog[] = [...RECENT, ...EXTRA].sort(
  (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
);

export const AGENT_HISTORY_FILTER_AGENTS = AGENTS;
export const AGENT_HISTORY_FILTER_STATUSES: Array<AgentHistoryStatus | "all"> = [
  "all",
  "success",
  "running",
  "failed",
];
