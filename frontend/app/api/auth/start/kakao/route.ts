import { handleOAuthStart } from "@/lib/oauth-start-handler";

export function GET(request: Request) {
  return handleOAuthStart(request, "kakao");
}
