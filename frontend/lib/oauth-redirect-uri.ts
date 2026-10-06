/** OAuth 콜백 origin — 네이버·카카오·Gmail 콘솔에 등록된 프로덕션 origin */
const DEFAULT_PRODUCTION_ORIGIN = "https://moneo.choseohee.com";

function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** OAuth 콜백 redirect_uri origin — 네이버·카카오·Gmail 콘솔 등록값과 일치 */
export function getOAuthRedirectOrigin(requestOrigin?: string): string {
  // 로컬은 env보다 요청 origin 우선 — 아니면 prod origin으로 mismatch 난다
  if (requestOrigin && isLocalOrigin(requestOrigin)) {
    return requestOrigin.replace(/\/$/, "");
  }
  const fromEnv =
    process.env.NEXT_PUBLIC_OAUTH_REDIRECT_ORIGIN?.trim() ||
    process.env.OAUTH_REDIRECT_ORIGIN?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
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
  return {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax" as const,
    path: "/",
    secure,
  };
}
