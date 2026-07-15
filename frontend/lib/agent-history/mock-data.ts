import type {
  AgentHistoryLog,
  AgentHistoryStatus,
  AgentName,
  AgentToolName,
} from "@/lib/agent-history/types";

const AGENTS: AgentName[] = [
  "Briefing Agent",
  "Doc Agent",
  "Report Agent",
  "Mail Agent",
];

const TOOLS: AgentToolName[] = [
  "calendar.list",
  "docs.search",
  "vector.query",
  "slack.digest",
  "report.generate",
  "email.draft",
];

const PROMPTS = [
  "오늘 오전 스탠드업 브리핑 요약해 줘",
  "Q3 계획 문서에서 리스크 항목만 추려 줘",
  "이번 주 진행 리포트 초안 만들어 줘",
  "고객 A에게 일정 조율 메일 초안 작성해 줘",
  "관련 Slack 채널 다이제스트 정리해 줘",
  "벡터 검색으로 온보딩 FAQ 관련 문단 찾아 줘",
];

const SUMMARIES = [
  "핵심 액션 3건과 블로커 1건을 요약했습니다.",
  "관련 문서 8건을 묶어 우선순위 목록을 만들었습니다.",
  "리포트 초안 초고를 생성했고 수치 섹션을 채웠습니다.",
  "메일 초안을 작성했고 수신자/제목을 제안했습니다.",
  "채널별 멘션·결정사항을 타임라인으로 정리했습니다.",
  "유사도 상위 청크를 인용과 함께 반환했습니다.",
];

/** deterministic 0..1 from integer seed */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.floor(rand(seed) * arr.length)]!;
}

function statusFor(i: number): AgentHistoryStatus {
  const r = rand(i * 17 + 3);
  if (r < 0.1) return "failed";
  if (r < 0.2) return "running";
  return "success";
}

function toolParams(tool: AgentToolName, seed: number): Record<string, string | number | boolean> {
  switch (tool) {
    case "calendar.list":
      return { range: "today", limit: 20 + Math.floor(rand(seed) * 10) };
    case "docs.search":
      return { q: pick(["Q3 plan", "onboarding", "risk"], seed), top_k: 8 };
    case "vector.query":
      return { collection: "knowledge", top_k: 6, min_score: 0.72 };
    case "slack.digest":
      return { channels: 2 + Math.floor(rand(seed) * 3), hours: 24 };
    case "report.generate":
      return { format: "markdown", sections: 4 };
    case "email.draft":
      return { tone: "formal", length: "short" };
    default:
      return {};
  }
}

/**
 * Demo logs (~30). Timestamps are relative to `baseMs` so SSR/CSR stay stable
 * within a session when baseMs is fixed (module load).
 */
function buildMockLogs(baseMs: number, count = 30): AgentHistoryLog[] {
  const logs: AgentHistoryLog[] = [];
  for (let i = 0; i < count; i++) {
    const agentName = pick(AGENTS, i * 3 + 1);
    const tool = pick(TOOLS, i * 5 + 2);
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
      agentName,
      tool,
      status,
      durationMs,
      tokens: Math.floor(rand(i * 19) * 1800) + 120,
      prompt: pick(PROMPTS, i * 7),
      responseSummary: pick(SUMMARIES, i * 11),
      toolParams: toolParams(tool, i * 23),
    });
  }
  return logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/** Stable for the lifetime of the JS module (refresh regenerates offsets from now). */
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
