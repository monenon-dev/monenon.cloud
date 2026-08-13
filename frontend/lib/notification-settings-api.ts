import { getApiBaseUrl } from "@/lib/api-base";

export type NotificationSettings = {
  user_id: number;
  alert_calendar_density: boolean;
  alert_urgent_messages: boolean;
  briefing_validator_mode: "auto" | "review";
};

export async function fetchNotificationSettings(
  userId: number,
  apiBaseUrl?: string
): Promise<NotificationSettings> {
  const base = (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(
    `${base}/orchestration/notification-settings?user_id=${userId}`,
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
  return raw as NotificationSettings;
}

export async function patchNotificationSettings(
  userId: number,
  patch: Partial<
    Pick<
      NotificationSettings,
      "alert_calendar_density" | "alert_urgent_messages" | "briefing_validator_mode"
    >
  >,
  apiBaseUrl?: string
): Promise<NotificationSettings> {
  const base = (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/orchestration/notification-settings`, {
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
  return raw as NotificationSettings;
}
