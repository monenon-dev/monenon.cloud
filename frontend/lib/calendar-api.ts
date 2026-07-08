import { getApiBaseUrl } from "@/lib/api-base";

const api = getApiBaseUrl();

export type CalendarEvent = {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  location: string;
};

export type CalendarAddResult = {
  ok: boolean;
  event: CalendarEvent;
  message: string;
};

export async function addCalendarEvent(
  userId: number,
  text: string
): Promise<CalendarAddResult> {
  const res = await fetch(`${api}/calendar/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as Record<string, unknown>).detail;
    throw new Error(typeof msg === "string" ? msg : "일정 등록에 실패했습니다.");
  }
  return data;
}
