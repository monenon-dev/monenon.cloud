/**
 * OAuth 콜백 origin.
 * 사이트 기본 진입은 www 이고, apex(choseohee.com)는 www 로 307 된다.
 * 네이버가 apex 로 돌려주면 콜백 홉에서 state 쿠키가 깨져 oauth-state-mismatch 가 난다.
 * 디벨로퍼스에 www 콜백이 등록돼 있으므로 www 로 통일한다.
 */
const DEFAULT_PRODUCTION_ORIGIN = "https://www.choseohee.com";

function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** apex → www (Vercel 307·쿠키·콘솔 등록값과 맞춤) */
function pinProductionOrigin(origin: string): string {
  try {
    const host = new URL(origin).hostname;
    if (host === "choseohee.com") {
      return DEFAULT_PRODUCTION_ORIGIN;
    }
  } catch {
    /* ignore */
  }
  return origin.replace(/\/$/, "");
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
    return pinProductionOrigin(fromEnv);
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
    if (host === "choseohee.com" || host.endsWith(".choseohee.com")) {
      return { ...base, domain: ".choseohee.com" };
    }
  } catch {
    /* localhost 등 — domain 미설정 */
  }
  return base;
}
