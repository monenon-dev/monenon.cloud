import { getApiBaseUrl } from "@/lib/api-base";
import type { ToolCallResult } from "@/components/home/tool-stream";

export type TodayBriefing = {
  content: string;
  tool_logs: ToolCallResult[];
  briefing_date: string;
  created: boolean;
  id?: number | null;
};

function isToolCallResult(value: unknown): value is ToolCallResult {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.timestamp === "string" &&
    typeof row.toolName === "string" &&
    (row.status === "success" || row.status === "error" || row.status === "pending") &&
    typeof row.params === "object" &&
    row.params !== null
  );
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
  const tool_logs = logsRaw.filter(isToolCallResult);
  return {
    content: data.content,
    tool_logs,
    briefing_date:
      typeof data.briefing_date === "string"
        ? data.briefing_date
        : new Date().toISOString().slice(0, 10),
    created: Boolean(data.created),
    id: typeof data.id === "number" ? data.id : null,
  };
}
