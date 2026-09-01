import { formatApiError } from "@/lib/format-api-error";
import { getChatUserId } from "@/lib/chat-user";
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

export type ScheduleRegisterResult = {
  ok: boolean;
  message?: string;
  needs_confirm?: boolean;
  conflicts?: Array<{ title: string; start_at: string; end_at: string }>;
};

export async function registerScheduleEvent(
  event: CalendarEventDraft,
  options?: { confirmOverlap?: boolean }
): Promise<ScheduleRegisterResult> {
  const userId = getChatUserId();
  const res = await fetch("/api/schedule/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...event,
      user_id: userId ?? undefined,
      confirm_overlap: Boolean(options?.confirmOverlap),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as ScheduleRegisterResult & {
    detail?: string;
  };
  if (data.needs_confirm) {
    return data;
  }
  if (!res.ok) {
    throw new Error(formatApiError(data, "일정 등록에 실패했습니다."));
  }

  return data;
}
