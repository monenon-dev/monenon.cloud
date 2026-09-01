import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

export default function AbcKakaoSignupRedirectPage() {
  redirect(routes.oauth.signupKakao);
}
