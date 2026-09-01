import { handleOAuthCallback } from "@/lib/oauth-callback-handler";

export async function GET(request: Request) {
  return handleOAuthCallback(request, "naver");
}
