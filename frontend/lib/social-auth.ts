/** 소셜 로그인 PoC — 네이버·카카오 약관 동의 토큰 (localStorage). */

export const NAVER_CONSENT_KEY = "moneo_naver_consent_token";
export const KAKAO_CONSENT_KEY = "moneo_kakao_consent_token";

export function saveNaverConsentToken(extra?: Record<string, unknown>): string {
  const token = `naver_consent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    token,
    provider: "naver",
    agreed_at: new Date().toISOString(),
    ...extra,
  };
  localStorage.setItem(NAVER_CONSENT_KEY, JSON.stringify(payload));
  return token;
}

export function getNaverConsentToken(): string | null {
  try {
    const raw = localStorage.getItem(NAVER_CONSENT_KEY);
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

export function saveKakaoConsentToken(extra?: Record<string, unknown>): string {
  const token = `kakao_consent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    token,
    provider: "kakao",
    agreed_at: new Date().toISOString(),
    ...extra,
  };
  localStorage.setItem(KAKAO_CONSENT_KEY, JSON.stringify(payload));
  return token;
}

export function getKakaoConsentToken(): string | null {
  try {
    const raw = localStorage.getItem(KAKAO_CONSENT_KEY);
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
