import { formatApiError } from "@/lib/format-api-error";

import { getApiBaseUrl } from "@/lib/api-base";
import {
  apiFetch,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/api-client";
import { clearSocialAuthStorage, purgeLegacySocialAuthStorage } from "@/lib/social-auth";
import { routes } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();
const AUTH_EXPIRES_AT_KEY = "auth_expires_at";
const AUTH_PROVIDER_KEY = "auth_provider";
const DEFAULT_ACCESS_TTL_MS = 10 * 60 * 1000;

export type AuthProvider = "credentials" | "google" | "naver" | "kakao";

export type AuthSession = {
  access_token?: string;
  user_id: number;
  nickname: string;
  role: string;
  provider?: AuthProvider;
  expires_at?: number;
};

function parseLoginResponse(data: Record<string, unknown>): AuthSession {
  const token = data.access_token;
  const nickname = data.nickname;
  const role = data.role;
  const userId = data.user_id;
  const expiresIn = data.expires_in;

  if (
    typeof token !== "string" ||
    typeof nickname !== "string" ||
    typeof role !== "string" ||
    typeof userId !== "number"
  ) {
    throw new Error("로그인 응답 형식이 올바르지 않습니다.");
  }

  const expiresAt =
    typeof expiresIn === "number" && Number.isFinite(expiresIn)
      ? Date.now() + expiresIn * 1000
      : Date.now() + DEFAULT_ACCESS_TTL_MS;

  return {
    access_token: token,
    user_id: userId,
    nickname,
    role,
    expires_at: expiresAt,
  };
}

/** 표시용 프로필은 sessionStorage, access token은 메모리 */
export function saveAuthSession(data: AuthSession): void {
  if (data.access_token) {
    setAccessToken(data.access_token);
  }
  sessionStorage.setItem("user_nickname", data.nickname);
  sessionStorage.setItem("user_role", data.role);
  sessionStorage.setItem("user_id", String(data.user_id));
  sessionStorage.setItem(AUTH_PROVIDER_KEY, data.provider || "credentials");
  sessionStorage.setItem(
    AUTH_EXPIRES_AT_KEY,
    String(data.expires_at ?? Date.now() + DEFAULT_ACCESS_TTL_MS)
  );
}

function purgeExpiredAuthSession(): void {
  const expiresAtRaw = sessionStorage.getItem(AUTH_EXPIRES_AT_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : NaN;
  if (Number.isFinite(expiresAt) && Date.now() > expiresAt && !getAccessToken()) {
    clearAuthSession();
  }
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  purgeLegacySocialAuthStorage();
  purgeExpiredAuthSession();
  const nickname = sessionStorage.getItem("user_nickname");
  const role = sessionStorage.getItem("user_role");
  const userIdRaw = sessionStorage.getItem("user_id");
  const provider = sessionStorage.getItem(AUTH_PROVIDER_KEY) as AuthProvider | null;
  const expiresAtRaw = sessionStorage.getItem(AUTH_EXPIRES_AT_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : NaN;
  const userId = userIdRaw ? Number(userIdRaw) : NaN;
  if (!nickname || !Number.isFinite(userId)) return null;
  return {
    access_token: getAccessToken() ?? undefined,
    user_id: userId,
    nickname,
    role: role || "user",
    provider: provider || undefined,
    expires_at: Number.isFinite(expiresAt) ? expiresAt : undefined,
  };
}

export function clearAuthSession(): void {
  clearAccessToken();
  sessionStorage.removeItem("user_nickname");
  sessionStorage.removeItem("user_role");
  sessionStorage.removeItem("user_id");
  sessionStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  sessionStorage.removeItem(AUTH_PROVIDER_KEY);
  clearSocialAuthStorage();
}

export async function logoutAuthSession(next = routes.oauth.login): Promise<void> {
  if (typeof window === "undefined") return;
  const provider = sessionStorage.getItem(AUTH_PROVIDER_KEY);
  try {
    await apiFetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      skipAuthRetry: true,
    });
  } catch {
    /* 네트워크 실패해도 로컬 세션은 정리 */
  }
  clearAuthSession();
  const params = new URLSearchParams({ next });
  if (provider) {
    params.set("provider", provider);
  }
  window.location.assign(`/api/auth/logout?${params.toString()}`);
}

/** refresh 쿠키로 access token 복원 — 새 탭·새로고침 시 */
export async function restoreAuthSessionFromRefresh(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const userIdRaw = sessionStorage.getItem("user_id");
  if (!userIdRaw) return false;
  if (getAccessToken()) return true;

  const res = await apiFetch(`${apiBaseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    skipAuthRetry: true,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof data.access_token !== "string") {
    clearAuthSession();
    return false;
  }
  const expiresIn = data.expires_in;
  const expiresAt =
    typeof expiresIn === "number" && Number.isFinite(expiresIn)
      ? Date.now() + expiresIn * 1000
      : Date.now() + DEFAULT_ACCESS_TTL_MS;
  setAccessToken(data.access_token);
  sessionStorage.setItem(AUTH_EXPIRES_AT_KEY, String(expiresAt));
  return true;
}

export type AdminSession = {
  access_token: string;
  email: string;
  nickname: string;
};

export async function loginAsAdmin(email: string, password: string): Promise<AdminSession> {
  const res = await fetch(`${apiBaseUrl}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data: Record<string, unknown> = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatApiError(data, "관리자 로그인에 실패했습니다."));
  }
  const token = data.access_token;
  const adminEmail = data.email;
  const nickname = data.nickname;
  if (typeof token !== "string" || typeof adminEmail !== "string" || typeof nickname !== "string") {
    throw new Error("관리자 로그인 응답 형식이 올바르지 않습니다.");
  }
  return { access_token: token, email: adminEmail, nickname };
}

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<AuthSession> {
  const res = await apiFetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    skipAuthRetry: true,
  });
  const data: Record<string, unknown> = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatApiError(data, "로그인에 실패했습니다."));
  }
  return parseLoginResponse(data);
}

export async function loginWithGoogle(credential: string): Promise<AuthSession> {
  const res = await apiFetch(`${apiBaseUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
    skipAuthRetry: true,
  });
  const data: Record<string, unknown> = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatApiError(data, "Google 로그인에 실패했습니다."));
  }
  return parseLoginResponse(data);
}

export async function loginWithOAuthCode(
  provider: "naver" | "kakao",
  code: string,
  redirectUri: string
): Promise<AuthSession> {
  const res = await apiFetch(`${apiBaseUrl}/auth/${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
    skipAuthRetry: true,
  });
  const data: Record<string, unknown> = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatApiError(data, `${provider} 로그인에 실패했습니다.`));
  }
  return parseLoginResponse(data);
}

// api-client re-export for convenience
export { getAccessToken } from "@/lib/api-client";