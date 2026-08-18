import { getApiBaseUrl } from "@/lib/api-base";
import { apiFetch } from "@/lib/api-client";

export type NotificationSettings = {
  user_id: number;
  alert_calendar_density: boolean;
  alert_urgent_messages: boolean;
  briefing_validator_mode: "auto" | "review";
  briefing_hour: number;
  briefing_minute: number;
  density_threshold: number;
  active_hours_start: number;
  active_hours_end: number;
};

export type NotificationSettingsPatch = Partial<
  Pick<
    NotificationSettings,
    | "alert_calendar_density"
    | "alert_urgent_messages"
    | "briefing_validator_mode"
    | "briefing_hour"
    | "briefing_minute"
    | "density_threshold"
    | "active_hours_start"
    | "active_hours_end"
  >
>;

function clamp(value: unknown, fallback: number, lo: number, hi: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.trunc(n)));
}

export function normalizeNotificationSettings(
  raw: Partial<NotificationSettings> & { user_id: number }
): NotificationSettings {
  const density = clamp(raw.density_threshold, 3, 2, 4);
  return {
    user_id: raw.user_id,
    alert_calendar_density: Boolean(raw.alert_calendar_density),
    alert_urgent_messages: Boolean(raw.alert_urgent_messages),
    briefing_validator_mode: raw.briefing_validator_mode === "review" ? "review" : "auto",
    briefing_hour: clamp(raw.briefing_hour, 7, 0, 23),
    briefing_minute: clamp(raw.briefing_minute, 0, 0, 59),
    density_threshold: density === 2 || density === 3 || density === 4 ? density : 3,
    active_hours_start: clamp(raw.active_hours_start, 8, 0, 23),
    active_hours_end: clamp(raw.active_hours_end, 20, 1, 24),
  };
}

export async function fetchNotificationSettings(
  userId: number,
  apiBaseUrl?: string
): Promise<NotificationSettings> {
  const base = (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await apiFetch(
    `${base}/orchestration/notification-settings`,
    { headers: { Accept: "application/json" } }
  );
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `알림 설정 조회 실패 (${res.status})`;
    throw new Error(detail);
  }
  const body = raw as Partial<NotificationSettings> & { user_id: number };
  return normalizeNotificationSettings({ ...body, user_id: body.user_id ?? userId });
}

export async function patchNotificationSettings(
  userId: number,
  patch: NotificationSettingsPatch,
  apiBaseUrl?: string
): Promise<NotificationSettings> {
  const base = (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await apiFetch(`${base}/orchestration/notification-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ user_id: userId, ...patch }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `알림 설정 저장 실패 (${res.status})`;
    throw new Error(detail);
  }
  const body = raw as Partial<NotificationSettings> & { user_id: number };
  return normalizeNotificationSettings({ ...body, user_id: body.user_id ?? userId });
}
