import { getApiBaseUrl } from "@/lib/api-base";
import type { ToolCallResult, ToolNodeStatus } from "@/components/home/tool-stream";
import type { WeeklyAction, WeeklyRisk } from "@/lib/weekly-report-api";

export type AgentChatResponseType = "briefing" | "report" | "chat";

export type AgentChatResponse = {
  type: AgentChatResponseType;
  content: string;
  tool_logs: ToolCallResult[];
  answer: string;
  confidence?: number;
  sources?: string[];
  intent?: string;
  risks?: WeeklyRisk[];
  next_actions?: WeeklyAction[];
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

function parseAgentChatResponse(raw: unknown): AgentChatResponse {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }
  const data = raw as Record<string, unknown>;

  const content =
    typeof data.content === "string"
      ? data.content
      : typeof data.answer === "string"
        ? data.answer
        : "";
  if (!content) {
    throw new Error("응답에 content가 없습니다.");
  }

  const typeRaw = data.type;
  const type: AgentChatResponseType =
    typeRaw === "briefing" || typeRaw === "report" || typeRaw === "chat"
      ? typeRaw
      : "chat";

  const logsRaw = Array.isArray(data.tool_logs) ? data.tool_logs : [];
  const risksRaw = Array.isArray(data.risks) ? data.risks : [];
  const actionsRaw = Array.isArray(data.next_actions) ? data.next_actions : [];

  return {
    type,
    content,
    answer: typeof data.answer === "string" ? data.answer : content,
    tool_logs: logsRaw
      .map(normalizeToolLog)
      .filter((x): x is ToolCallResult => x !== null),
    confidence: typeof data.confidence === "number" ? data.confidence : undefined,
    sources: Array.isArray(data.sources)
      ? data.sources.filter((s): s is string => typeof s === "string")
      : undefined,
    intent: typeof data.intent === "string" ? data.intent : undefined,
    risks:
      risksRaw.length > 0
        ? risksRaw.map(normalizeRisk).filter((x): x is WeeklyRisk => x !== null)
        : undefined,
    next_actions:
      actionsRaw.length > 0
        ? actionsRaw
            .map(normalizeAction)
            .filter((x): x is WeeklyAction => x !== null)
        : undefined,
  };
}

export async function callAgentChatApi(
  prompt: string,
  userId: number,
  options?: {
    apiBaseUrl?: string;
    speechTone?: string | null;
    userType?: string | null;
    industry?: string | null;
  }
): Promise<AgentChatResponse> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const body: Record<string, string | number> = {
    prompt,
    user_id: userId,
  };
  if (options?.speechTone) body.speech_tone = options.speechTone;
  if (options?.userType) body.user_type = options.userType;
  if (options?.industry) body.industry = options.industry;

  const res = await fetch(`${base}/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
        : `요청 실패 (${res.status})`;
    throw new Error(detail);
  }
  return parseAgentChatResponse(raw);
}
