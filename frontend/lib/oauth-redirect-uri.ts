const PRODUCTION_ORIGIN = "https://monenon.cloud";

function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** OAuth 콜백에 쓸 사이트 origin — 네이버·카카오 콘솔 등록값과 일치 */
export function getCanonicalOAuthOrigin(requestOrigin: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_OAUTH_REDIRECT_ORIGIN?.trim() ||
    process.env.OAUTH_REDIRECT_ORIGIN?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (isLocalOrigin(requestOrigin)) {
    return requestOrigin.replace(/\/$/, "");
  }
  return PRODUCTION_ORIGIN;
}

export function buildOAuthRedirectUri(
  provider: "naver" | "kakao",
  requestOrigin: string
): string {
  return `${getCanonicalOAuthOrigin(requestOrigin)}/api/auth/callback/${provider}`;
}
