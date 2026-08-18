import { getApiBaseUrl } from "@/lib/api-base";
import { todaySeoulISO } from "@/lib/seoul-date";

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

const MEETINGS_STORAGE_PREFIX = "moneo.home.meetings.";

const TIME_24H_RE = /^(\d{1,2}):(\d{2})$/;

export function isValidMeetingTime(raw: string): boolean {
  const m = raw.trim().match(TIME_24H_RE);
  if (!m) return false;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function normalizeMeetingTime(raw: string): string {
  const m = raw.trim().match(TIME_24H_RE);
  if (!m) return raw.trim();
  return `${Number(m[1]).toString().padStart(2, "0")}:${m[2]}`;
}

export function meetingsStorageKey(date = todaySeoulISO()): string {
  return `${MEETINGS_STORAGE_PREFIX}${date}`;
}

export function loadSavedMeetings(): DemoCalendarEventInput[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(meetingsStorageKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (typeof row !== "object" || row === null) return null;
        const item = row as Record<string, unknown>;
        if (typeof item.time !== "string" || typeof item.title !== "string") return null;
        const time = normalizeMeetingTime(item.time);
        const title = item.title.trim();
        if (!time || !title) return null;
        return { time, title };
      })
      .filter((x): x is DemoCalendarEventInput => x !== null)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function persistSavedMeetings(events: DemoCalendarEventInput[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(meetingsStorageKey(), JSON.stringify(events.slice(0, 10)));
}

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

function parseMeetingsPayload(raw: unknown): DemoCalendarEventInput[] {
  if (typeof raw !== "object" || raw === null) return [];
  const data = raw as Record<string, unknown>;
  const eventsRaw = Array.isArray(data.events) ? data.events : [];
  return eventsRaw
    .map((row) => {
      if (typeof row !== "object" || row === null) return null;
      const item = row as Record<string, unknown>;
      if (typeof item.time !== "string" || typeof item.title !== "string") return null;
      const time = normalizeMeetingTime(item.time);
      const title = item.title.trim();
      if (!time || !title) return null;
      return { time, title };
    })
    .filter((x): x is DemoCalendarEventInput => x !== null)
    .slice(0, 10);
}

export async function fetchSavedMeetings(
  userId: number,
  options?: { apiBaseUrl?: string }
): Promise<DemoCalendarEventInput[]> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/demo/meetings?user_id=${userId}`);
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(readErrorDetail(raw, `미팅을 불러오지 못했습니다 (${res.status})`));
  }
  return parseMeetingsPayload(raw);
}

export async function saveMeetings(
  userId: number,
  events: DemoCalendarEventInput[],
  options?: { apiBaseUrl?: string }
): Promise<DemoCalendarEventInput[]> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/demo/meetings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      events: events.map((e) => ({
        time: normalizeMeetingTime(e.time),
        title: e.title.trim(),
      })),
    }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(readErrorDetail(raw, `미팅 저장에 실패했습니다 (${res.status})`));
  }
  return parseMeetingsPayload(raw);
}

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
    throw new Error(readErrorDetail(raw, `확인 요청 실패 (${res.status})`));
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
