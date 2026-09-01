import { handleIntegrationOAuthCallback } from "@/lib/integration-oauth-callback-handler";

type RouteParams = { params: Promise<{ provider: string }> };

export async function GET(request: Request, context: RouteParams) {
  const { provider } = await context.params;
  if (provider !== "slack" && provider !== "gmail") {
    return new Response("unsupported provider", { status: 400 });
  }
  return handleIntegrationOAuthCallback(request, provider);
}
