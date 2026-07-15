/** Agent 히스토리 로그 — 나중에 API 응답 스키마에 맞추면 됩니다. */

export type AgentHistoryStatus = "success" | "running" | "failed";

export type AgentName =
  | "Briefing Agent"
  | "Doc Agent"
  | "Report Agent"
  | "Mail Agent";

export type AgentToolName =
  | "calendar.list"
  | "docs.search"
  | "vector.query"
  | "slack.digest"
  | "report.generate"
  | "email.draft";

export interface AgentHistoryLog {
  id: string;
  /** ISO-8601 */
  timestamp: string;
  agentName: AgentName;
  tool: AgentToolName;
  status: AgentHistoryStatus;
  /** milliseconds */
  durationMs: number;
  tokens: number;
  prompt: string;
  responseSummary: string;
  toolParams: Record<string, string | number | boolean>;
}

/** API 교체 시: fetch → AgentHistoryLog[] 매핑만 맞추면 됩니다. */
export type AgentHistoryListResponse = {
  items: AgentHistoryLog[];
  total: number;
};
