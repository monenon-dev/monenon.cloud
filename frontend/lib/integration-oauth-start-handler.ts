import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import {
  buildIntegrationOAuthRedirectUri,
  integrationOAuthCookieOptions,
} from "@/lib/integration-oauth-redirect-uri";
import { routes } from "@/lib/routes";

export type IntegrationProvider = "slack" | "gmail";

const SLACK_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "im:history",
  "mpim:history",
  "users:read",
  "chat:write",
  "im:write",
].join(",");

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

function readSlackClientId(): string {
  return (
    process.env.SLACK_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_SLACK_CLIENT_ID?.trim() ||
    ""
  );
}

function readGoogleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

export function handleIntegrationOAuthStart(
  request: Request,
  provider: IntegrationProvider
) {
  const url = new URL(request.url);
  const userIdRaw = url.searchParams.get("user_id");
  const userId = userIdRaw ? Number(userIdRaw) : NaN;
  const settingsUrl = new URL(routes.lifestyle.settings, request.url);
  settingsUrl.searchParams.set("tab", "integrations");

  if (!Number.isFinite(userId) || userId < 1) {
    settingsUrl.searchParams.set("error", "integration-user-missing");
    return NextResponse.redirect(settingsUrl);
  }

  const nextRaw = url.searchParams.get("next") || settingsUrl.pathname + settingsUrl.search;
  const next = nextRaw.startsWith("/") ? nextRaw : settingsUrl.pathname + settingsUrl.search;
  const redirectUri = buildIntegrationOAuthRedirectUri(provider, url.origin);
  const state = randomUUID();
  const cookieOpts = integrationOAuthCookieOptions(url.origin);

  if (provider === "slack") {
    const clientId = readSlackClientId();
    if (!clientId) {
      settingsUrl.searchParams.set("error", "slack-not-configured");
      return NextResponse.redirect(settingsUrl);
    }
    const authorize = new URL("https://slack.com/oauth/v2/authorize");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("scope", SLACK_SCOPES);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("state", state);
    const response = NextResponse.redirect(authorize);
    response.cookies.set("moneo_integration_state", state, cookieOpts);
    response.cookies.set("moneo_integration_user_id", String(userId), cookieOpts);
    response.cookies.set("moneo_integration_provider", provider, cookieOpts);
    response.cookies.set("moneo_integration_next", next, cookieOpts);
    return response;
  }

  const clientId = readGoogleClientId();
  if (!clientId) {
    settingsUrl.searchParams.set("error", "gmail-not-configured");
    return NextResponse.redirect(settingsUrl);
  }
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", GMAIL_SCOPES);
  authorize.searchParams.set("access_type", "offline");
  authorize.searchParams.set("prompt", "consent");
  authorize.searchParams.set("state", state);
  const response = NextResponse.redirect(authorize);
  response.cookies.set("moneo_integration_state", state, cookieOpts);
  response.cookies.set("moneo_integration_user_id", String(userId), cookieOpts);
  response.cookies.set("moneo_integration_provider", provider, cookieOpts);
  response.cookies.set("moneo_integration_next", next, cookieOpts);
  return response;
}
