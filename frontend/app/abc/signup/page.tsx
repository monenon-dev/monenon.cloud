import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

export default function AbcSignupRedirectPage() {
  redirect(routes.oauth.signupNaver);
}
