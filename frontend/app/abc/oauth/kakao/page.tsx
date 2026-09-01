import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

export default function AbcKakaoOauthRedirectPage() {
  redirect(routes.oauth.kakao);
}
