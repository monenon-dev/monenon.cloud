import { getApiBaseUrl } from "@/lib/api-base";

export type ProactiveAlertItem = {
  id: number;
  alert_type: string;
  trigger_key: string;
  message: string;
  sent_at: string;
  read_at: string | null;
  is_read: boolean;
};

export type ProactiveAlertList = {
  items: ProactiveAlertItem[];
  unread_count: number;
};

function base(apiBaseUrl?: string) {
  return (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
}

function errorDetail(raw: unknown, fallback: string): string {
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

export async function fetchProactiveAlerts(
  userId: number,
  options?: { unreadOnly?: boolean; apiBaseUrl?: string }
): Promise<ProactiveAlertList> {
  const unreadOnly = options?.unreadOnly ?? false;
  const res = await fetch(
    `${base(options?.apiBaseUrl)}/orchestration/alerts?user_id=${userId}&unread_only=${unreadOnly}`,
    { headers: { Accept: "application/json" } }
  );
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(errorDetail(raw, `알림 조회 실패 (${res.status})`));
  }
  return raw as ProactiveAlertList;
}

export async function markProactiveAlertRead(
  userId: number,
  alertId: number,
  apiBaseUrl?: string
): Promise<ProactiveAlertItem> {
  const res = await fetch(
    `${base(apiBaseUrl)}/orchestration/alerts/${alertId}/read?user_id=${userId}`,
    { method: "PATCH", headers: { Accept: "application/json" } }
  );
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(errorDetail(raw, `알림 읽음 처리 실패 (${res.status})`));
  }
  return raw as ProactiveAlertItem;
}
