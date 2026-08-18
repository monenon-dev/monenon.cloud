import { getApiBaseUrl } from "@/lib/api-base";
import { apiFetch } from "@/lib/api-client";
import type { ToolCallResult, ToolNodeStatus } from "@/components/home/tool-stream";

export type WeeklyRisk = {
  title: string;
  severity: "high" | "medium" | "low" | string;
  detail: string;
  evidence_days?: string[];
};

export type WeeklyAction = {
  title: string;
  priority: "high" | "medium" | "low" | string;
  detail: string;
};

export type WeeklyReport = {
  summary: string;
  risks: WeeklyRisk[];
  next_actions: WeeklyAction[];
  tool_logs: ToolCallResult[];
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

function normalizeRisk(value: unknown): WeeklyRisk | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.title !== "string" || !row.title.trim()) return null;
  return {
    title: row.title.trim(),
    severity: typeof row.severity === "string" ? row.severity : "medium",
    detail: typeof row.detail === "string" ? row.detail : "",
    evidence_days: Array.isArray(row.evidence_days)
      ? row.evidence_days.filter((d): d is string => typeof d === "string")
      : [],
  };
}

function normalizeAction(value: unknown): WeeklyAction | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.title !== "string" || !row.title.trim()) return null;
  return {
    title: row.title.trim(),
    priority: typeof row.priority === "string" ? row.priority : "medium",
    detail: typeof row.detail === "string" ? row.detail : "",
  };
}

export async function fetchWeeklyReport(
  userId: number,
  options?: {
    apiBaseUrl?: string;
    speechTone?: string | null;
    userType?: string | null;
    industry?: string | null;
  }
): Promise<WeeklyReport> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const body: Record<string, string | number> = { user_id: userId };
  if (options?.speechTone) body.speech_tone = options.speechTone;
  if (options?.userType) body.user_type = options.userType;
  if (options?.industry) body.industry = options.industry;

  const res = await apiFetch(`${base}/agent/report/weekly`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `주간 리포트 요청 실패 (${res.status})`;
    throw new Error(detail);
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("주간 리포트 응답 형식이 올바르지 않습니다.");
  }
  const data = raw as Record<string, unknown>;
  if (typeof data.summary !== "string") {
    throw new Error("리포트 요약이 없습니다.");
  }
  const risksRaw = Array.isArray(data.risks) ? data.risks : [];
  const actionsRaw = Array.isArray(data.next_actions) ? data.next_actions : [];
  const logsRaw = Array.isArray(data.tool_logs) ? data.tool_logs : [];
  return {
    summary: data.summary,
    risks: risksRaw.map(normalizeRisk).filter((x): x is WeeklyRisk => x !== null),
    next_actions: actionsRaw
      .map(normalizeAction)
      .filter((x): x is WeeklyAction => x !== null),
    tool_logs: logsRaw
      .map(normalizeToolLog)
      .filter((x): x is ToolCallResult => x !== null),
  };
}
