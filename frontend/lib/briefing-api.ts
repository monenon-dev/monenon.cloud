import { getApiBaseUrl } from "@/lib/api-base";
import type { ToolCallResult, ToolNodeStatus } from "@/components/home/tool-stream";

export type PendingReview = {
  content: string;
  reason: string;
};

export type TodayBriefing = {
  content: string;
  tool_logs: ToolCallResult[];
  briefing_date: string;
  created: boolean;
  id?: number | null;
  pending_review?: PendingReview | null;
};

const NODE_STATUSES: ToolNodeStatus[] = [
  "success",
  "error",
  "pending",
  "running",
  "failed",
  "retrying",
];

function isToolCallResult(value: unknown): value is ToolCallResult {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.timestamp !== "string" ||
    typeof row.toolName !== "string" ||
    typeof row.params !== "object" ||
    row.params === null
  ) {
    return false;
  }
  if (!NODE_STATUSES.includes(row.status as ToolNodeStatus)) return false;
  return true;
}

function normalizeToolLog(value: unknown): ToolCallResult | null {
  if (!isToolCallResult(value)) return null;
  const row = value as ToolCallResult & Record<string, unknown>;
  return {
    ...row,
    node: typeof row.node === "string" ? row.node : undefined,
    attempt: typeof row.attempt === "number" ? row.attempt : undefined,
    detail: typeof row.detail === "string" ? row.detail : undefined,
  };
}

function normalizePendingReview(value: unknown): PendingReview | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.content !== "string" || !row.content.trim()) return null;
  return {
    content: row.content.trim(),
    reason:
      typeof row.reason === "string" && row.reason.trim()
        ? row.reason.trim()
        : "검증 실패",
  };
}

export async function fetchTodayBriefing(
  userId: number,
  options?: {
    apiBaseUrl?: string;
    speechTone?: string | null;
    userType?: string | null;
    industry?: string | null;
  }
): Promise<TodayBriefing> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const params = new URLSearchParams({ user_id: String(userId) });
  if (options?.speechTone) params.set("speech_tone", options.speechTone);
  if (options?.userType) params.set("user_type", options.userType);
  if (options?.industry) params.set("industry", options.industry);

  const res = await fetch(`${base}/agent/briefing/today?${params.toString()}`, {
    method: "GET",
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
        : `브리핑 요청 실패 (${res.status})`;
    throw new Error(detail);
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("브리핑 응답 형식이 올바르지 않습니다.");
  }
  const data = raw as Record<string, unknown>;
  if (typeof data.content !== "string") {
    throw new Error("브리핑 본문이 없습니다.");
  }
  const logsRaw = Array.isArray(data.tool_logs) ? data.tool_logs : [];
  const tool_logs = logsRaw
    .map(normalizeToolLog)
    .filter((x): x is ToolCallResult => x !== null);
  return {
    content: data.content,
    tool_logs,
    briefing_date:
      typeof data.briefing_date === "string"
        ? data.briefing_date
        : new Date().toISOString().slice(0, 10),
    created: Boolean(data.created),
    id: typeof data.id === "number" ? data.id : null,
    pending_review: normalizePendingReview(data.pending_review),
  };
}

export async function submitBriefingReview(
  briefingId: number,
  userId: number,
  decision: "include" | "exclude",
  options?: { apiBaseUrl?: string }
): Promise<TodayBriefing> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/agent/briefing/${briefingId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ user_id: userId, decision }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `검토 요청 실패 (${res.status})`;
    throw new Error(detail);
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("검토 응답 형식이 올바르지 않습니다.");
  }
  const data = raw as Record<string, unknown>;
  if (typeof data.content !== "string") {
    throw new Error("브리핑 본문이 없습니다.");
  }
  const logsRaw = Array.isArray(data.tool_logs) ? data.tool_logs : [];
  return {
    content: data.content,
    tool_logs: logsRaw
      .map(normalizeToolLog)
      .filter((x): x is ToolCallResult => x !== null),
    briefing_date:
      typeof data.briefing_date === "string"
        ? data.briefing_date
        : new Date().toISOString().slice(0, 10),
    created: Boolean(data.created),
    id: typeof data.id === "number" ? data.id : briefingId,
    pending_review: normalizePendingReview(data.pending_review),
  };
}
