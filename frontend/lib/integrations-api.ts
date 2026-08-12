import { getApiBaseUrl } from "@/lib/api-base";

export type IntegrationProvider = "slack" | "gmail";

export type IntegrationStatus = {
  provider: IntegrationProvider;
  connected: boolean;
  enabled: boolean;
  connected_at: string | null;
  last_sync_hint: string | null;
};

export async function fetchIntegrations(
  userId: number,
  apiBaseUrl?: string
): Promise<IntegrationStatus[]> {
  const base = (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/orchestration/integrations?user_id=${userId}`, {
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
  if (
    typeof raw !== "object" ||
    raw === null ||
    !Array.isArray((raw as { integrations?: unknown }).integrations)
  ) {
    return [];
  }
  return (raw as { integrations: IntegrationStatus[] }).integrations;
}

export async function patchIntegration(
  userId: number,
  provider: IntegrationProvider,
  enabled: boolean,
  apiBaseUrl?: string
): Promise<IntegrationStatus> {
  const base = (apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/orchestration/integrations`, {
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

export function integrationOAuthStartUrl(
  provider: IntegrationProvider,
  userId: number,
  next?: string
): string {
  const params = new URLSearchParams({ user_id: String(userId) });
  if (next) params.set("next", next);
  return `/api/auth/start/integration/${provider}?${params.toString()}`;
}
