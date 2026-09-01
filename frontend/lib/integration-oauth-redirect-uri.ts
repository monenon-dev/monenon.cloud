import { oauthCookieOptions, getOAuthRedirectOrigin } from "@/lib/oauth-redirect-uri";

export type IntegrationProvider = "slack" | "gmail";

export function buildIntegrationOAuthRedirectUri(
  provider: IntegrationProvider,
  requestOrigin?: string
): string {
  return `${getOAuthRedirectOrigin(requestOrigin)}/api/auth/callback/integration/${provider}`;
}

export function integrationOAuthCookieOptions(requestOrigin: string) {
  return oauthCookieOptions(requestOrigin);
}
