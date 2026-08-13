/** Vercel 기본 도메인이 www 로 리다이렉트되므로 apex 대신 www 를 쓴다. */
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
  // apex 로 들어오더라도 콜백은 www 로 통일 (apex→www 307 Hop 중 state 쿠키 유실 방지)
  if (requestOrigin) {
    try {
      const url = new URL(requestOrigin);
      if (url.hostname === "monenon.cloud" || url.hostname === "www.monenon.cloud") {
        return DEFAULT_PRODUCTION_ORIGIN;
      }
    } catch {
      /* fall through */
    }
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
