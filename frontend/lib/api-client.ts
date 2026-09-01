import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
};

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ next });
  window.location.assign(`${routes.oauth.login}?${params.toString()}`);
}

async function refreshAccessToken(): Promise<string | null> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || typeof data.access_token !== "string") {
    return null;
  }
  accessToken = data.access_token;
  return accessToken;
}

function singleFlightRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export type ApiFetchInit = RequestInit & {
  /** 401 시 refresh·재시도 없이 그대로 반환 */
  skipAuthRetry?: boolean;
};

export async function apiFetch(input: string, init: ApiFetchInit = {}): Promise<Response> {
  const { skipAuthRetry, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let res = await fetch(input, {
    ...rest,
    headers,
    credentials: rest.credentials ?? "include",
  });

  if (res.status !== 401 || skipAuthRetry) {
    return res;
  }

  const newToken = await singleFlightRefresh();
  if (!newToken) {
    clearAccessToken();
    redirectToLogin();
    return res;
  }

  headers.set("Authorization", `Bearer ${newToken}`);
  return fetch(input, {
    ...rest,
    headers,
    credentials: rest.credentials ?? "include",
  });
}
