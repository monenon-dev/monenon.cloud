const DEFAULT_PRODUCTION_ORIGIN = "https://monenon.cloud";

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
  const base = {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax" as const,
    path: "/",
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
