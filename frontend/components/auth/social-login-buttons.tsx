"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import type { AuthSession } from "@/lib/auth-api";
import { resolvePostAuthRedirect } from "@/lib/mypage-preferences";

type SocialLoginButtonsProps = {
  redirectTo?: string;
  forceRedirect?: boolean;
  className?: string;
};

function oauthStartUrl(provider: "naver" | "kakao", redirectTo: string): string {
  const next = redirectTo.startsWith("/") ? redirectTo : "/";
  const params = new URLSearchParams({ next });
  return `/api/auth/start/${provider}?${params.toString()}`;
}

export function SocialLoginButtons({
  redirectTo = "/",
  forceRedirect = false,
  className = "",
}: SocialLoginButtonsProps) {
  const router = useRouter();
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleSuccess = useCallback(
    (session: AuthSession) => {
      const target = forceRedirect
        ? redirectTo
        : resolvePostAuthRedirect(session.user_id, redirectTo);
      router.push(target);
      router.refresh();
    },
    [forceRedirect, redirectTo, router]
  );

  return (
    <div className={`space-y-2.5 ${className}`}>
      <button
        type="button"
        onClick={() => {
          window.location.href = oauthStartUrl("naver", redirectTo);
        }}
        className="flex w-full items-center gap-3 rounded-xl bg-[#03C75A] px-3 py-2.5 text-left text-sm font-semibold text-white hover:brightness-95"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-[#03C75A]">
          N
        </span>
        <span className="flex-1 text-center pr-8">네이버 아이디로 로그인</span>
      </button>

      <button
        type="button"
        onClick={() => {
          window.location.href = oauthStartUrl("kakao", redirectTo);
        }}
        className="flex w-full items-center gap-3 rounded-xl bg-[#FEE500] px-3 py-2.5 text-left text-sm font-semibold text-[#391B1B] hover:brightness-95"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#391B1B] text-xs font-black text-[#FEE500]">
          톡
        </span>
        <span className="flex-1 text-center pr-8">카카오계정으로 로그인</span>
      </button>

      {googleError ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400 px-1">
          {googleError}
        </p>
      ) : null}

      <GoogleSignInButton
        variant="social"
        onSuccess={handleGoogleSuccess}
        onError={setGoogleError}
      />
    </div>
  );
}
