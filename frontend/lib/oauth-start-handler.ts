import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import {
  buildOAuthRedirectUri,
  getCanonicalOAuthOrigin,
} from "@/lib/oauth-redirect-uri";
import { routes } from "@/lib/routes";

type OAuthProvider = "naver" | "kakao";

const AUTHORIZE_URL: Record<OAuthProvider, string> = {
  naver: "https://nid.naver.com/oauth2.0/authorize",
  kakao: "https://kauth.kakao.com/oauth/authorize",
};

const CLIENT_ID_ENV: Record<OAuthProvider, [string, string, string]> = {
  naver: ["NAVER_CLIENT_ID", "NEXT_PUBLIC_NAVER_CLIENT_ID", "0CpM2KmaSEktVO7sUYtb"],
  kakao: ["KAKAO_CLIENT_ID", "NEXT_PUBLIC_KAKAO_CLIENT_ID", "42603bba4006609e87b4207a5a1e5d7d"],
};

function readClientId(provider: OAuthProvider): string {
  const [primary, fallback, defaultId] = CLIENT_ID_ENV[provider];
  return process.env[primary]?.trim() || process.env[fallback]?.trim() || defaultId;
}

export function handleOAuthStart(request: Request, provider: OAuthProvider) {
  const requestUrl = new URL(request.url);
  const requestOrigin = requestUrl.origin;
  const canonicalOrigin = getCanonicalOAuthOrigin(requestOrigin);

  if (requestOrigin !== canonicalOrigin) {
    const canonical = new URL(request.url);
    const canonicalUrl = new URL(canonicalOrigin);
    canonical.protocol = canonicalUrl.protocol;
    canonical.host = canonicalUrl.host;
    return NextResponse.redirect(canonical);
  }

  const clientId = readClientId(provider);
  if (!clientId) {
    const loginUrl = new URL(routes.oauth.login, request.url);
    loginUrl.searchParams.set("error", `${provider}-not-configured`);
    return NextResponse.redirect(loginUrl);
  }

  const url = new URL(request.url);
  const nextRaw = url.searchParams.get("next") || "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";
  const redirectUri = buildOAuthRedirectUri(provider, requestOrigin);
  const state = randomUUID();

  const authorize = new URL(AUTHORIZE_URL[provider]);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  if (provider === "kakao") {
    authorize.searchParams.set("scope", "profile_nickname,account_email");
  }

  const response = NextResponse.redirect(authorize);
  response.cookies.set("moneo_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax",
    path: "/",
  });
  response.cookies.set("moneo_oauth_next", next, {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
