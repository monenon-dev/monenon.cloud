import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import {
  buildOAuthRedirectUri,
  oauthCookieOptions,
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

  const clientId = readClientId(provider);
  if (!clientId) {
    const loginUrl = new URL(routes.oauth.login, request.url);
    loginUrl.searchParams.set("error", `${provider}-not-configured`);
    return NextResponse.redirect(loginUrl);
  }

  const nextRaw = requestUrl.searchParams.get("next") || "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";
  const redirectUri = buildOAuthRedirectUri(provider, requestOrigin);
  const state = randomUUID();
  const cookieOpts = oauthCookieOptions(requestOrigin);
  const scopeParam = requestUrl.searchParams.get("scope")?.trim();

  const authorize = new URL(AUTHORIZE_URL[provider]);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  if (provider === "kakao") {
    authorize.searchParams.set("lang", "ko");
    authorize.searchParams.set("prompt", "login");
    if (scopeParam) {
      authorize.searchParams.set("scope", scopeParam);
    }
  } else {
    authorize.searchParams.set("locale", "ko_KR");
  }

  const response = NextResponse.redirect(authorize);
  response.cookies.set("moneo_oauth_state", state, cookieOpts);
  response.cookies.set("moneo_oauth_next", next, cookieOpts);
  if (provider === "kakao" && scopeParam?.includes("talk_calendar")) {
    response.cookies.set("moneo_oauth_intent", "kakao_calendar_sync", cookieOpts);
  }
  return response;
}
