import { formatApiError } from "@/lib/format-api-error";
import type { CalendarEventDraft } from "@/lib/schedule-types";

export async function composeScheduleWithGemini(prompt: string): Promise<CalendarEventDraft> {
  const res = await fetch("/api/schedule/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(formatApiError(data, "일정 초안 작성에 실패했습니다."));
  }

  return data as CalendarEventDraft;
}

export async function registerScheduleEvent(
  event: CalendarEventDraft,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/schedule/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(formatApiError(data, "일정 등록에 실패했습니다."));
  }

  return data as { ok: boolean; message?: string };
}
