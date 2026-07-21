/** abc.com API — 개발용 일반 로그인만 연결. */

const DEFAULT_ABC_API = "http://api.abc.com";

export const ABC_NAVER_CONSENT_KEY = "abc_naver_consent_token";
export const ABC_KAKAO_CONSENT_KEY = "abc_kakao_consent_token";

export function getAbcApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ABC_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_ABC_API;
}

/** 네이버 약관 동의 후 발급·저장하는 로컬 토큰 (PoC). */
export function saveNaverConsentToken(extra?: Record<string, unknown>): string {
  const token = `naver_consent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    token,
    provider: "naver",
    agreed_at: new Date().toISOString(),
    ...extra,
  };
  localStorage.setItem(ABC_NAVER_CONSENT_KEY, JSON.stringify(payload));
  return token;
}

export function getNaverConsentToken(): string | null {
  try {
    const raw = localStorage.getItem(ABC_NAVER_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
}

export function hasNaverConsent(): boolean {
  return Boolean(getNaverConsentToken());
}

/** 카카오 약관 동의 후 발급·저장하는 로컬 토큰 (PoC). */
export function saveKakaoConsentToken(extra?: Record<string, unknown>): string {
  const token = `kakao_consent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    token,
    provider: "kakao",
    agreed_at: new Date().toISOString(),
    ...extra,
  };
  localStorage.setItem(ABC_KAKAO_CONSENT_KEY, JSON.stringify(payload));
  return token;
}

export function getKakaoConsentToken(): string | null {
  try {
    const raw = localStorage.getItem(ABC_KAKAO_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
}

export function hasKakaoConsent(): boolean {
  return Boolean(getKakaoConsentToken());
}

export type AbcUserType = "general" | "biz" | "work";

export type AbcLoginResult = {
  ok: boolean;
  access_token?: string;
  user?: { id?: string; username?: string };
  detail?: string;
};

export async function abcLoginWithPassword(input: {
  username: string;
  password: string;
  userType: AbcUserType;
}): Promise<AbcLoginResult> {
  const base = getAbcApiBaseUrl();
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      username: input.username,
      password: input.password,
      user_type: input.userType,
    }),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!res.ok) {
    const detail =
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.message === "string" && data.message) ||
      `로그인 실패 (${res.status}). API: ${base}/auth/login`;
    throw new Error(detail);
  }

  return {
    ok: true,
    access_token: typeof data.access_token === "string" ? data.access_token : undefined,
    user: (data.user as AbcLoginResult["user"]) ?? undefined,
  };
}
