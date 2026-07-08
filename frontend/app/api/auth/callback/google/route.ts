import { NextResponse } from "next/server";

import { routes } from "@/lib/routes";

/** Google Console redirect URI 등록 시 404 방지 — 이 앱은 GIS 버튼 방식을 사용합니다. */
export function GET(request: Request) {
  const loginUrl = new URL(routes.oauth.login, request.url);
  loginUrl.searchParams.set("from", "google-callback");
  return NextResponse.redirect(loginUrl);
}
