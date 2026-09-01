import { NextResponse } from "next/server";

import { routes } from "@/lib/routes";

const KAKAO_LOGOUT_URL = "https://kauth.kakao.com/oauth/logout";

function authCookieOptions(origin: string) {
  const secure = origin.startsWith("https://");
  return {
    httpOnly: true,
    secure,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };
}

function readKakaoClientId(): string {
  return (
    process.env.KAKAO_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID?.trim() ||
    ""
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const nextRaw = url.searchParams.get("next") || routes.oauth.login;
  const next = nextRaw.startsWith("/") ? nextRaw : routes.oauth.login;
  const nextUrl = new URL(next, request.url);

  const response = NextResponse.redirect(nextUrl);
  response.cookies.delete("moneo_oauth_state");
  response.cookies.delete("moneo_oauth_next");
  response.cookies.delete("moneo_oauth_intent");
  response.cookies.set("moneo_auth_token", "", authCookieOptions(url.origin));

  if (provider === "kakao") {
    const clientId = readKakaoClientId();
    if (clientId) {
      const kakaoLogout = new URL(KAKAO_LOGOUT_URL);
      kakaoLogout.searchParams.set("client_id", clientId);
      kakaoLogout.searchParams.set("logout_redirect_uri", nextUrl.toString());
      const kakaoResponse = NextResponse.redirect(kakaoLogout);
      kakaoResponse.cookies.delete("moneo_oauth_state");
      kakaoResponse.cookies.delete("moneo_oauth_next");
      kakaoResponse.cookies.delete("moneo_oauth_intent");
      kakaoResponse.cookies.set("moneo_auth_token", "", authCookieOptions(url.origin));
      return kakaoResponse;
    }
  }

  return response;
}
