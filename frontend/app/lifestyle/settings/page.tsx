import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

/** @deprecated 에이전트 설정 진입은 마이페이지 취향 설정으로 통합 */
export default function SettingsPage() {
  redirect(routes.oauth.mypagePreferences);
}
