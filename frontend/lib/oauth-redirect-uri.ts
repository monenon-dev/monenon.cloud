/**
 * OAuth 콜백 origin.
 * 사이트 기본 진입은 www 이고, apex(monenon.cloud)는 www 로 307 된다.
 * 네이버가 apex 로 돌려주면 콜백 홉에서 state 쿠키가 깨져 oauth-state-mismatch 가 난다.
 * 디벨로퍼스에 www 콜백이 등록돼 있으므로 www 로 통일한다.
 */
const DEFAULT_PRODUCTION_ORIGIN = "https://www.monenon.cloud";

function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** OAuth 콜백 redirect_uri origin — 네이버·카카오 콘솔 등록값과 일치 */
export function getOAuthRedirectOrigin(requestOrigin?: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_OAUTH_REDIRECT_ORIGIN?.trim() ||
    process.env.OAUTH_REDIRECT_ORIGIN?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (requestOrigin && isLocalOrigin(requestOrigin)) {
    return requestOrigin.replace(/\/$/, "");
  }
  return DEFAULT_PRODUCTION_ORIGIN;
}

export function buildOAuthRedirectUri(
  provider: "naver" | "kakao",
  requestOrigin?: string
): string {
  return `${getOAuthRedirectOrigin(requestOrigin)}/api/auth/callback/${provider}`;
}

export function oauthCookieOptions(requestOrigin: string) {
  let secure = false;
  try {
    secure = new URL(requestOrigin).protocol === "https:";
  } catch {
    secure = false;
  }
  const base = {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax" as const,
    path: "/",
    secure,
  };
  try {
    const host = new URL(requestOrigin).hostname;
    if (host === "monenon.cloud" || host.endsWith(".monenon.cloud")) {
      return { ...base, domain: ".monenon.cloud" };
    }
  } catch {
    /* localhost 등 — domain 미설정 */
  }
  return base;
}
