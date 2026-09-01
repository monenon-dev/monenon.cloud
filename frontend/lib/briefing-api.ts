import { getApiBaseUrl } from "@/lib/api-base";
import { apiFetch } from "@/lib/api-client";
import type { ToolCallResult, ToolNodeStatus } from "@/components/home/tool-stream";
import { ensureTodayDateInBriefing, todaySeoulISO } from "@/lib/seoul-date";

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
  user_notes?: string;
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
  const content = row.content.trim();
  const reason =
    typeof row.reason === "string" && row.reason.trim()
      ? row.reason.trim()
      : "검증 실패";
  // 문서 환각은 채팅 검토 카드에 올리지 않음 (tool stream 전용)
  if (isDocsHallucinationText(content) || isDocsHallucinationText(reason)) {
    return null;
  }
  return { content, reason };
}

const DOCS_HALLUCINATION_MARKERS = [
  "문서 저장소",
  "q3-roadmap",
  "Q3 로드맵",
  "North-star KPI",
  "브리핑 목표 시간 45초",
] as const;

export function isDocsHallucinationText(text: string): boolean {
  const lower = text.toLowerCase();
  return DOCS_HALLUCINATION_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}

/** 채팅 본문에서 문서 환각 문장·단락을 제거한다. */
export function stripDocsHallucinationFromChat(text: string): string {
  if (!text.trim() || !isDocsHallucinationText(text)) return text;
  const parts = text.split(/\n{2,}/);
  const kept = parts.filter((p) => !isDocsHallucinationText(p));
  let cleaned = kept.join("\n\n").trim();
  if (!cleaned) {
    cleaned = text
      .split("\n")
      .filter((line) => !isDocsHallucinationText(line))
      .join("\n")
      .trim();
  }
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

/** 본문 맨 앞의 「오늘의 브리핑」 제목 줄을 제거한다. */
export function stripBriefingTitleHeading(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && !lines[0]!.trim()) lines.shift();
  const first = lines[0]?.trim() ?? "";
  if (/^#{1,6}\s*오늘의\s*(업무\s*)?브리핑\s*$/i.test(first)) {
    lines.shift();
    while (lines.length > 0 && !lines[0]!.trim()) lines.shift();
  }
  return lines.join("\n").trim();
}

/** 브리핑 하단 「현재 예시 데이터로…」 안내 줄 제거 */
export function stripExampleDataDisclaimer(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*[*\-•]?\s*현재\s*예시\s*데이터/i.test(line.trim()))
    .join("\n")
    .trim();
}

function parseTodayBriefing(
  data: Record<string, unknown>,
  fallbackId?: number | null
): TodayBriefing {
  if (typeof data.content !== "string") {
    throw new Error("브리핑 본문이 없습니다.");
  }
  const logsRaw = Array.isArray(data.tool_logs) ? data.tool_logs : [];
  return {
    content: ensureTodayDateInBriefing(
      stripExampleDataDisclaimer(
        stripBriefingTitleHeading(
          stripDocsHallucinationFromChat(data.content) || data.content
        ) || data.content
      )
    ),
    tool_logs: logsRaw
      .map(normalizeToolLog)
      .filter((x): x is ToolCallResult => x !== null),
    briefing_date:
      typeof data.briefing_date === "string"
        ? data.briefing_date
        : todaySeoulISO(),
    created: Boolean(data.created),
    id: typeof data.id === "number" ? data.id : fallbackId ?? null,
    pending_review: normalizePendingReview(data.pending_review),
    user_notes: typeof data.user_notes === "string" ? data.user_notes : "",
  };
}

export async function fetchTodayBriefing(
  userId: number,
  options?: {
    apiBaseUrl?: string;
    speechTone?: string | null;
    userType?: string | null;
    industry?: string | null;
    forceRefresh?: boolean;
  }
): Promise<TodayBriefing> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const params = new URLSearchParams();
  if (options?.speechTone) params.set("speech_tone", options.speechTone);
  if (options?.userType) params.set("user_type", options.userType);
  if (options?.industry) params.set("industry", options.industry);
  if (options?.forceRefresh) params.set("force_refresh", "true");

  const res = await apiFetch(`${base}/agent/briefing/today?${params.toString()}`, {
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
  return parseTodayBriefing(data);
}

export async function submitBriefingReview(
  briefingId: number,
  userId: number,
  decision: "include" | "exclude",
  options?: { apiBaseUrl?: string }
): Promise<TodayBriefing> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await apiFetch(`${base}/agent/briefing/${briefingId}/review`, {
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
  return parseTodayBriefing(data, briefingId);
}

export async function saveTodayBriefingNotes(
  userId: number,
  notes: string,
  options?: { apiBaseUrl?: string }
): Promise<TodayBriefing> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await apiFetch(`${base}/agent/briefing/today/notes`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ user_id: userId, notes }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `메모 저장 실패 (${res.status})`;
    throw new Error(detail);
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("메모 저장 응답 형식이 올바르지 않습니다.");
  }
  return parseTodayBriefing(raw as Record<string, unknown>);
}
