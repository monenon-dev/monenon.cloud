"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { saveAuthSession } from "@/lib/auth-api";
import { resolvePostAuthRedirect } from "@/lib/mypage-preferences";
import { routes } from "@/lib/routes";
import { patchUserSettings } from "@/lib/user-settings";

/** @deprecated /oauth/exchange 로 이전 — 기존 북마크·링크 호환 */
function OAuthCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userIdRaw = searchParams.get("user_id");
    const nickname = searchParams.get("nickname");
    const role = searchParams.get("role");
    const providerRaw = searchParams.get("provider");
    const provider =
      providerRaw === "kakao" ||
      providerRaw === "naver" ||
      providerRaw === "google" ||
      providerRaw === "credentials"
        ? providerRaw
        : "kakao";
    const expiresAtRaw = searchParams.get("expires_at");
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : NaN;
    const nextRaw = searchParams.get("next") || "/";
    const next = nextRaw.startsWith("/") ? nextRaw : "/";
    const userId = userIdRaw ? Number(userIdRaw) : NaN;
    const enableKakaoCalendar = searchParams.get("kakao_calendar_sync") === "1";

    if (!nickname || !role || !Number.isFinite(userId)) {
      router.replace(`${routes.oauth.login}?error=oauth-invalid-response`);
      return;
    }

    saveAuthSession({
      user_id: userId,
      nickname,
      role,
      provider,
      expires_at: Number.isFinite(expiresAt) ? expiresAt : undefined,
    });

    void (async () => {
      if (enableKakaoCalendar) {
        try {
          await patchUserSettings(userId, { kakao_calendar_sync: true });
        } catch {
          /* 연동 플래그 실패해도 로그인은 유지 */
        }
      }
      router.replace(resolvePostAuthRedirect(userId, next));
      router.refresh();
    })();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <Loader2 className="animate-spin size-8 text-indigo-600" aria-label="로그인 처리 중" />
    </main>
  );
}

export default function OAuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
          <Loader2 className="animate-spin size-8 text-indigo-600" aria-label="로딩 중" />
        </main>
      }
    >
      <OAuthCompleteInner />
    </Suspense>
  );
}
