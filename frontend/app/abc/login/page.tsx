import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

/** @deprecated abc 전용 로그인 제거 — Moneo 통합 로그인으로 이동 */
export default function AbcLoginRedirectPage() {
  redirect(routes.oauth.login);
}
