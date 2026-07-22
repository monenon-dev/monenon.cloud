/** 소셜 로그인 PoC — 약관·세션은 탭(sessionStorage)에만 보관. localStorage 미사용. */

export const NAVER_CONSENT_KEY = "moneo_naver_consent_token";
export const KAKAO_CONSENT_KEY = "moneo_kakao_consent_token";
export const NAVER_SESSION_KEY = "moneo_naver_session";
export const KAKAO_SESSION_KEY = "moneo_kakao_session";
export const SOCIAL_LOGIN_NEXT_KEY = "moneo_social_login_next";

/** 이전 PoC가 localStorage에 남긴 키 — clear 시 제거 */
const LEGACY_LOCAL_KEYS = [
  NAVER_CONSENT_KEY,
  KAKAO_CONSENT_KEY,
  NAVER_SESSION_KEY,
  KAKAO_SESSION_KEY,
] as const;

let legacyPurged = false;

/** 앱 최초 접속 시 localStorage에 남은 PoC 소셜 토큰 제거 */
export function purgeLegacySocialAuthStorage(): void {
  if (legacyPurged || typeof window === "undefined") return;
  legacyPurged = true;
  for (const key of LEGACY_LOCAL_KEYS) {
    localStorage.removeItem(key);
  }
}

function readJsonSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveSocialLoginNext(next: string): void {
  if (typeof window === "undefined") return;
  const safe = next.trim().startsWith("/") ? next.trim() : "/";
  sessionStorage.setItem(SOCIAL_LOGIN_NEXT_KEY, safe);
}

export function consumeSocialLoginNext(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  const raw = sessionStorage.getItem(SOCIAL_LOGIN_NEXT_KEY);
  sessionStorage.removeItem(SOCIAL_LOGIN_NEXT_KEY);
  if (raw && raw.startsWith("/")) return raw;
  return fallback;
}

export function saveNaverConsentToken(extra?: Record<string, unknown>): string {
  const token = `naver_consent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    token,
    provider: "naver",
    agreed_at: new Date().toISOString(),
    ...extra,
  };
  sessionStorage.setItem(NAVER_CONSENT_KEY, JSON.stringify(payload));
  return token;
}

export function getNaverConsentToken(): string | null {
  const parsed = readJsonSession<{ token?: string }>(NAVER_CONSENT_KEY);
  return parsed?.token || null;
}

export function hasNaverConsent(): boolean {
  return Boolean(getNaverConsentToken());
}

export function saveKakaoConsentToken(extra?: Record<string, unknown>): string {
  const token = `kakao_consent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    token,
    provider: "kakao",
    agreed_at: new Date().toISOString(),
    ...extra,
  };
  sessionStorage.setItem(KAKAO_CONSENT_KEY, JSON.stringify(payload));
  return token;
}

export function getKakaoConsentToken(): string | null {
  const parsed = readJsonSession<{ token?: string }>(KAKAO_CONSENT_KEY);
  return parsed?.token || null;
}

export function hasKakaoConsent(): boolean {
  return Boolean(getKakaoConsentToken());
}

export function saveSocialProviderSession(
  provider: "naver" | "kakao",
  payload: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const key = provider === "naver" ? NAVER_SESSION_KEY : KAKAO_SESSION_KEY;
  sessionStorage.setItem(key, JSON.stringify({ provider, ...payload, at: new Date().toISOString() }));
}

/** 로그아웃·회원가입 진입 시 PoC 소셜 흔적 제거 */
export function clearSocialAuthStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of [
    NAVER_CONSENT_KEY,
    KAKAO_CONSENT_KEY,
    NAVER_SESSION_KEY,
    KAKAO_SESSION_KEY,
    SOCIAL_LOGIN_NEXT_KEY,
  ]) {
    sessionStorage.removeItem(key);
  }
  for (const key of LEGACY_LOCAL_KEYS) {
    localStorage.removeItem(key);
  }
}
