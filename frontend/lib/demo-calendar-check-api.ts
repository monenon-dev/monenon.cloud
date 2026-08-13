import { getApiBaseUrl } from "@/lib/api-base";

export type DemoCalendarEventInput = {
  time: string;
  title: string;
};

export type DemoCalendarIssue = {
  alert_type: string;
  summary: string;
  detail: string;
};

export type DemoCalendarCheckResult = {
  status: "clear" | "attention";
  headline: string;
  issues: DemoCalendarIssue[];
  event_count: number;
};

export async function postDemoCalendarCheck(
  events: DemoCalendarEventInput[],
  options?: { apiBaseUrl?: string }
): Promise<DemoCalendarCheckResult> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/demo/calendar-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `확인 요청 실패 (${res.status})`;
    throw new Error(detail);
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }
  const data = raw as Record<string, unknown>;
  const status = data.status === "attention" || data.status === "clear" ? data.status : null;
  if (!status || typeof data.headline !== "string") {
    throw new Error("응답에 결과 요약이 없습니다.");
  }
  const issuesRaw = Array.isArray(data.issues) ? data.issues : [];
  return {
    status,
    headline: data.headline,
    event_count: typeof data.event_count === "number" ? data.event_count : events.length,
    issues: issuesRaw
      .map((row) => {
        if (typeof row !== "object" || row === null) return null;
        const issue = row as Record<string, unknown>;
        if (
          typeof issue.alert_type !== "string" ||
          typeof issue.summary !== "string" ||
          typeof issue.detail !== "string"
        ) {
          return null;
        }
        return {
          alert_type: issue.alert_type,
          summary: issue.summary,
          detail: issue.detail,
        };
      })
      .filter((x): x is DemoCalendarIssue => x !== null),
  };
}
