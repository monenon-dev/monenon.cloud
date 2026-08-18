import { formatApiError } from "@/lib/format-api-error";

import { getApiBaseUrl } from "@/lib/api-base";
import { clearSocialAuthStorage, purgeLegacySocialAuthStorage } from "@/lib/social-auth";
import { routes } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();
const AUTH_EXPIRES_AT_KEY = "auth_expires_at";
const AUTH_PROVIDER_KEY = "auth_provider";
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

export type AuthProvider = "credentials" | "google" | "naver" | "kakao";

export type AuthSession = {
  access_token?: string;
  user_id: number;
  nickname: string;
  role: string;
  provider?: AuthProvider;
  expires_at?: number;
};

/** 탭(sessionStorage)에만 저장 — 브라우저를 닫으면 로그인 해제 */
export function saveAuthSession(data: AuthSession): void {
  sessionStorage.removeItem("access_token");
  sessionStorage.setItem("user_nickname", data.nickname);
  sessionStorage.setItem("user_role", data.role);
  sessionStorage.setItem("user_id", String(data.user_id));
  sessionStorage.setItem(AUTH_PROVIDER_KEY, data.provider || "credentials");
  sessionStorage.setItem(
    AUTH_EXPIRES_AT_KEY,
    String(data.expires_at ?? Date.now() + ACCESS_TOKEN_TTL_MS)
  );
}

function purgeExpiredAuthSession(): void {
  const expiresAtRaw = sessionStorage.getItem(AUTH_EXPIRES_AT_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : NaN;
  if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
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
    user_id: userId,
    nickname,
    role: role || "user",
    provider: provider || undefined,
    expires_at: Number.isFinite(expiresAt) ? expiresAt : undefined,
  };
}

export function clearAuthSession(): void {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("user_nickname");
  sessionStorage.removeItem("user_role");
  sessionStorage.removeItem("user_id");
  sessionStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  sessionStorage.removeItem(AUTH_PROVIDER_KEY);
  clearSocialAuthStorage();
}

export function logoutAuthSession(next = routes.oauth.login): void {
  if (typeof window === "undefined") return;
  const provider = sessionStorage.getItem(AUTH_PROVIDER_KEY);
  clearAuthSession();
  const params = new URLSearchParams({ next });
  if (provider) {
    params.set("provider", provider);
  }
  window.location.assign(`/api/auth/logout?${params.toString()}`);
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
  const res = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data: Record<string, unknown> = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatApiError(data, "로그인에 실패했습니다."));
  }

  const token = data.access_token;
  const nickname = data.nickname;
  const role = data.role;
  const userId = data.user_id;

  if (
    typeof token !== "string" ||
    typeof nickname !== "string" ||
    typeof role !== "string" ||
    typeof userId !== "number"
  ) {
    throw new Error("로그인 응답 형식이 올바르지 않습니다.");
  }

  return {
    access_token: token,
    user_id: userId,
    nickname,
    role,
  };
}

export async function loginWithGoogle(credential: string): Promise<AuthSession> {
  const res = await fetch(`${apiBaseUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  const data: Record<string, unknown> = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatApiError(data, "Google 로그인에 실패했습니다."));
  }

  const token = data.access_token;
  const nickname = data.nickname;
  const role = data.role;
  const userId = data.user_id;

  if (
    typeof token !== "string" ||
    typeof nickname !== "string" ||
    typeof role !== "string" ||
    typeof userId !== "number"
  ) {
    throw new Error("Google 로그인 응답 형식이 올바르지 않습니다.");
  }

  return {
    access_token: token,
    user_id: userId,
    nickname,
    role,
  };
}
