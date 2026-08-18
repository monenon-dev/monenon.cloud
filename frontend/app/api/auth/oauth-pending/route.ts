import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const code = cookieStore.get("moneo_oauth_code")?.value;
  const redirectUri = cookieStore.get("moneo_oauth_redirect_uri")?.value;
  const provider = cookieStore.get("moneo_oauth_provider")?.value;

  if (!code || !redirectUri || (provider !== "naver" && provider !== "kakao")) {
    return NextResponse.json({ detail: "OAuth 정보가 없습니다." }, { status: 400 });
  }

  const response = NextResponse.json({ code, redirect_uri: redirectUri, provider });
  response.cookies.delete("moneo_oauth_code");
  response.cookies.delete("moneo_oauth_redirect_uri");
  response.cookies.delete("moneo_oauth_provider");
  return response;
}
