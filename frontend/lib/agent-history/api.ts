import { getApiBaseUrl } from "@/lib/api-base";
import { apiFetch } from "@/lib/api-client";
import { getAuthSession } from "@/lib/auth-api";
import type {
  AgentHistoryListResponse,
  AgentHistoryLog,
  AgentHistoryStatus,
  FetchAgentHistoryOptions,
} from "@/lib/agent-history/types";

const STATUSES: AgentHistoryStatus[] = ["success", "running", "failed"];

function asStatus(value: unknown): AgentHistoryStatus {
  return STATUSES.includes(value as AgentHistoryStatus)
    ? (value as AgentHistoryStatus)
    : "success";
}

function parseLog(raw: unknown): AgentHistoryLog | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.timestamp !== "string") return null;
  if (typeof row.agentName !== "string" || typeof row.tool !== "string") return null;
  if (typeof row.prompt !== "string") return null;
  return {
    id: row.id,
    timestamp: row.timestamp,
    agentName: row.agentName as AgentHistoryLog["agentName"],
    tool: row.tool as AgentHistoryLog["tool"],
    status: asStatus(row.status),
    durationMs: typeof row.durationMs === "number" ? row.durationMs : 0,
    tokens: typeof row.tokens === "number" ? row.tokens : 0,
    prompt: row.prompt,
    responseSummary: typeof row.responseSummary === "string" ? row.responseSummary : "",
    toolParams:
      typeof row.toolParams === "object" && row.toolParams !== null
        ? (row.toolParams as Record<string, string | number | boolean>)
        : {},
  };
}

/**
 * 로그인한 사용자의 채팅 기반 히스토리.
 * 세션이 없으면 빈 목록.
 */
export async function fetchAgentHistoryLogs(
  options: FetchAgentHistoryOptions = {}
): Promise<AgentHistoryListResponse> {
  const session = getAuthSession();
  if (!session) {
    return { items: [], total: 0, hasMore: false };
  }

  const base = getApiBaseUrl().replace(/\/$/, "");
  const params = new URLSearchParams({
    limit: String(options.limit ?? 20),
  });
  if (options.since) params.set("since", options.since);
  if (options.before) params.set("before", options.before);

  const res = await apiFetch(`${base}/platform/agent-history?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `히스토리를 불러오지 못했습니다 (${res.status})`;
    throw new Error(detail);
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("히스토리 응답 형식이 올바르지 않습니다.");
  }
  const data = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  return {
    items: itemsRaw.map(parseLog).filter((x): x is AgentHistoryLog => x !== null),
    total: typeof data.total === "number" ? data.total : itemsRaw.length,
    hasMore: data.hasMore === true,
  };
}
