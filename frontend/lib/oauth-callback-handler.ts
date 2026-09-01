import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildOAuthRedirectUri } from "@/lib/oauth-redirect-uri";
import { routes } from "@/lib/routes";

type OAuthProvider = "naver" | "kakao";

const OAUTH_PENDING_MAX_AGE = 120;

function pendingCookieOptions(origin: string) {
  const secure = origin.startsWith("https://");
  return {
    httpOnly: true,
    secure,
    sameSite: "strict" as const,
    path: "/",
    maxAge: OAUTH_PENDING_MAX_AGE,
  };
}

export async function handleOAuthCallback(request: Request, provider: OAuthProvider) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const loginUrl = new URL(routes.oauth.login, request.url);

  if (providerError || !code) {
    loginUrl.searchParams.set("error", providerError || "oauth-cancelled");
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("moneo_oauth_state")?.value;
  const nextRaw = cookieStore.get("moneo_oauth_next")?.value || "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  if (!savedState || savedState !== state) {
    loginUrl.searchParams.set("error", "oauth-state-mismatch");
    return NextResponse.redirect(loginUrl);
  }

  const redirectUri = buildOAuthRedirectUri(provider, url.origin);
  const exchange = new URL("/oauth/exchange", request.url);
  exchange.searchParams.set("provider", provider);
  exchange.searchParams.set("next", next);
  const intent = cookieStore.get("moneo_oauth_intent")?.value;
  if (provider === "kakao" && intent === "kakao_calendar_sync") {
    exchange.searchParams.set("kakao_calendar_sync", "1");
  }

  const response = NextResponse.redirect(exchange);
  const cookieOpts = pendingCookieOptions(url.origin);
  response.cookies.set("moneo_oauth_code", code, cookieOpts);
  response.cookies.set("moneo_oauth_redirect_uri", redirectUri, cookieOpts);
  response.cookies.set("moneo_oauth_provider", provider, cookieOpts);
  response.cookies.delete("moneo_oauth_state");
  response.cookies.delete("moneo_oauth_next");
  response.cookies.delete("moneo_oauth_intent");
  return response;
}
