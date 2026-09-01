import { getApiBaseUrl } from "@/lib/api-base";
import { apiFetch } from "@/lib/api-client";

export type IntegrationProvider = "slack" | "gmail";

export type IntegrationStatus = {
  provider: IntegrationProvider;
  connected: boolean;
  enabled: boolean;
  connected_at: string | null;
  last_sync_hint: string | null;
  briefing_notify?: boolean;
};

export type IntegrationsListResult = {
  integrations: IntegrationStatus[];
  briefing_notify: boolean;
};

export async function fetchIntegrations(
  userId: number,
  apiBaseUrl?: string
): Promise<IntegrationsListResult> {
  const base = (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await apiFetch(`${base}/orchestration/integrations`, {
    headers: { Accept: "application/json" },
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `연동 상태 조회 실패 (${res.status})`;
    throw new Error(detail);
  }
  if (typeof raw !== "object" || raw === null) {
    return { integrations: [], briefing_notify: false };
  }
  const data = raw as { integrations?: unknown; briefing_notify?: unknown };
  const integrations = Array.isArray(data.integrations)
    ? (data.integrations as IntegrationStatus[])
    : [];
  return {
    integrations,
    briefing_notify: Boolean(data.briefing_notify),
  };
}

export async function patchIntegration(
  userId: number,
  provider: IntegrationProvider,
  enabled: boolean,
  apiBaseUrl?: string
): Promise<IntegrationStatus> {
  const base = (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await apiFetch(`${base}/orchestration/integrations`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ user_id: userId, provider, enabled }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `연동 설정 저장 실패 (${res.status})`;
    throw new Error(detail);
  }
  return raw as IntegrationStatus;
}

export async function patchBriefingNotify(
  userId: number,
  enabled: boolean,
  apiBaseUrl?: string
): Promise<IntegrationsListResult> {
  const base = (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await apiFetch(`${base}/orchestration/integrations/briefing-notify`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ user_id: userId, enabled }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `브리핑 알림 설정 저장 실패 (${res.status})`;
    throw new Error(detail);
  }
  if (typeof raw !== "object" || raw === null) {
    return { integrations: [], briefing_notify: enabled };
  }
  const data = raw as { integrations?: unknown; briefing_notify?: unknown };
  return {
    integrations: Array.isArray(data.integrations)
      ? (data.integrations as IntegrationStatus[])
      : [],
    briefing_notify: Boolean(data.briefing_notify),
  };
}

export function integrationOAuthStartUrl(
  provider: IntegrationProvider,
  userId: number,
  next?: string
): string {
  const params = new URLSearchParams({ user_id: String(userId) });
  if (next) params.set("next", next);
  return `/api/auth/start/integration/${provider}?${params.toString()}`;
}
