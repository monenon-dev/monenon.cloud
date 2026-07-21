import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/api-base";
import { buildOAuthRedirectUri } from "@/lib/oauth-redirect-uri";
import { routes } from "@/lib/routes";

type OAuthProvider = "naver" | "kakao";

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
  const apiBase = getApiBaseUrl();

  let data: Record<string, unknown> = {};
  try {
    const res = await fetch(`${apiBase}/auth/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });
    data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const detail =
        typeof data.detail === "string" ? data.detail : `${provider} 로그인에 실패했습니다.`;
      loginUrl.searchParams.set("error", detail);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    loginUrl.searchParams.set("error", "api-unreachable");
    return NextResponse.redirect(loginUrl);
  }

  const accessToken = data.access_token;
  const userId = data.user_id;
  const nickname = data.nickname;
  const role = data.role;

  if (
    typeof accessToken !== "string" ||
    typeof nickname !== "string" ||
    typeof role !== "string" ||
    typeof userId !== "number"
  ) {
    loginUrl.searchParams.set("error", "oauth-invalid-response");
    return NextResponse.redirect(loginUrl);
  }

  const complete = new URL("/oauth/complete", request.url);
  complete.searchParams.set("access_token", accessToken);
  complete.searchParams.set("user_id", String(userId));
  complete.searchParams.set("nickname", nickname);
  complete.searchParams.set("role", role);
  complete.searchParams.set("next", next);

  const response = NextResponse.redirect(complete);
  response.cookies.delete("moneo_oauth_state");
  response.cookies.delete("moneo_oauth_next");
  return response;
}
