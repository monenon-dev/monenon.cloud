import { getApiBaseUrl } from "@/lib/api-base";

export type DemoDocSummaryResult = {
  summary_lines: string[];
  next_action: string | null;
  truncated: boolean;
  notice: string | null;
};

export const DOC_SUMMARY_MAX_CHARS = 3000;

function readErrorDetail(raw: unknown, fallback: string): string {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "detail" in raw &&
    typeof (raw as { detail: unknown }).detail === "string"
  ) {
    return (raw as { detail: string }).detail;
  }
  return fallback;
}

export async function postDemoDocSummary(
  text: string,
  options?: { apiBaseUrl?: string }
): Promise<DemoDocSummaryResult> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/demo/doc-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(readErrorDetail(raw, `요약 요청 실패 (${res.status})`));
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }
  const data = raw as Record<string, unknown>;
  const summaryRaw = Array.isArray(data.summary_lines) ? data.summary_lines : [];
  const summary_lines = summaryRaw
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);
  if (summary_lines.length === 0) {
    throw new Error("요약 결과가 비어 있습니다.");
  }
  return {
    summary_lines,
    next_action: typeof data.next_action === "string" ? data.next_action : null,
    truncated: data.truncated === true,
    notice: typeof data.notice === "string" ? data.notice : null,
  };
}
