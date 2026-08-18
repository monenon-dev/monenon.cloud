"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { loginWithOAuthCode, saveAuthSession } from "@/lib/auth-api";
import { resolvePostAuthRedirect } from "@/lib/mypage-preferences";
import { routes } from "@/lib/routes";
import { patchUserSettings } from "@/lib/user-settings";

function OAuthExchangeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextRaw = searchParams.get("next") || "/";
    const next = nextRaw.startsWith("/") ? nextRaw : "/";
    const enableKakaoCalendar = searchParams.get("kakao_calendar_sync") === "1";

    void (async () => {
      let payload: { code: string; redirect_uri: string; provider: "naver" | "kakao" };
      try {
        const pendingRes = await fetch("/api/auth/oauth-pending");
        const pending = (await pendingRes.json().catch(() => ({}))) as {
          code?: string;
          redirect_uri?: string;
          provider?: string;
          detail?: string;
        };
        if (
          !pendingRes.ok ||
          typeof pending.code !== "string" ||
          typeof pending.redirect_uri !== "string" ||
          (pending.provider !== "naver" && pending.provider !== "kakao")
        ) {
          throw new Error(pending.detail || "oauth-invalid-response");
        }
        payload = {
          code: pending.code,
          redirect_uri: pending.redirect_uri,
          provider: pending.provider,
        };
      } catch {
        router.replace(`${routes.oauth.login}?error=oauth-invalid-response`);
        return;
      }

      try {
        const session = await loginWithOAuthCode(
          payload.provider,
          payload.code,
          payload.redirect_uri
        );
        saveAuthSession({ ...session, provider: payload.provider });

        if (enableKakaoCalendar) {
          try {
            await patchUserSettings(session.user_id, { kakao_calendar_sync: true });
          } catch {
            /* 연동 플래그 실패해도 로그인은 유지 */
          }
        }

        router.replace(resolvePostAuthRedirect(session.user_id, next));
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "oauth-failed";
        router.replace(`${routes.oauth.login}?error=${encodeURIComponent(message)}`);
      }
    })();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <Loader2 className="animate-spin size-8 text-indigo-600" aria-label="로그인 처리 중" />
    </main>
  );
}

export default function OAuthExchangePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
          <Loader2 className="animate-spin size-8 text-indigo-600" aria-label="로딩 중" />
        </main>
      }
    >
      <OAuthExchangeInner />
    </Suspense>
  );
}
