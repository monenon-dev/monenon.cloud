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

export type CalendarConflict = {
  title: string;
  start_at: string;
  end_at: string;
};

export type CalendarAddResult = {
  ok: boolean;
  event: CalendarEvent | null;
  message: string;
  needs_confirm?: boolean;
  conflicts?: CalendarConflict[];
  kakao?: Record<string, unknown>;
};

export async function addCalendarEvent(
  userId: number,
  text: string,
  options?: { confirmOverlap?: boolean }
): Promise<CalendarAddResult> {
  const res = await fetch(`${api}/calendar/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      text,
      confirm_overlap: Boolean(options?.confirmOverlap),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as CalendarAddResult & {
    detail?: string;
  };
  if (!res.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "일정 등록에 실패했습니다.");
  }
  return data;
}

export async function syncKakaoCalendarEvent(body: {
  user_id: number;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  confirm_overlap?: boolean;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${api}/calendar/kakao/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail = data.detail;
    throw new Error(typeof detail === "string" ? detail : "톡캘린더 동기화에 실패했습니다.");
  }
  return data;
}
