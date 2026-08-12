import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/api-base";
import {
  buildIntegrationOAuthRedirectUri,
  type IntegrationProvider,
} from "@/lib/integration-oauth-redirect-uri";
import { routes } from "@/lib/routes";

export async function handleIntegrationOAuthCallback(
  request: Request,
  provider: IntegrationProvider
) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  const settingsUrl = new URL(routes.lifestyle.settings, request.url);
  settingsUrl.searchParams.set("tab", "integrations");

  if (providerError || !code) {
    settingsUrl.searchParams.set("error", providerError || "integration-cancelled");
    return NextResponse.redirect(settingsUrl);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("moneo_integration_state")?.value;
  const userIdRaw = cookieStore.get("moneo_integration_user_id")?.value;
  const savedProvider = cookieStore.get("moneo_integration_provider")?.value;
  const nextRaw = cookieStore.get("moneo_integration_next")?.value;
  const next =
    nextRaw && nextRaw.startsWith("/")
      ? nextRaw
      : `${settingsUrl.pathname}${settingsUrl.search}`;

  if (!savedState || savedState !== state || savedProvider !== provider) {
    settingsUrl.searchParams.set("error", "integration-state-mismatch");
    return NextResponse.redirect(settingsUrl);
  }

  const userId = userIdRaw ? Number(userIdRaw) : NaN;
  if (!Number.isFinite(userId) || userId < 1) {
    settingsUrl.searchParams.set("error", "integration-user-missing");
    return NextResponse.redirect(settingsUrl);
  }

  const redirectUri = buildIntegrationOAuthRedirectUri(provider, url.origin);
  const apiBase = getApiBaseUrl().replace(/\/$/, "");
  const endpoint =
    provider === "slack"
      ? `${apiBase}/orchestration/integrations/slack`
      : `${apiBase}/orchestration/integrations/gmail`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        user_id: userId,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (data as { detail: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : `${provider} 연동에 실패했습니다.`;
      settingsUrl.searchParams.set("error", detail);
      return NextResponse.redirect(settingsUrl);
    }
  } catch {
    settingsUrl.searchParams.set("error", "api-unreachable");
    return NextResponse.redirect(settingsUrl);
  }

  const done = new URL(next, request.url);
  done.searchParams.set("integration", provider);
  done.searchParams.set("connected", "1");
  const response = NextResponse.redirect(done);
  response.cookies.delete("moneo_integration_state");
  response.cookies.delete("moneo_integration_user_id");
  response.cookies.delete("moneo_integration_provider");
  response.cookies.delete("moneo_integration_next");
  return response;
}
