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

/** Outline social CTA — brand color only on the icon; dark shell + soft hover tint. */
const SOCIAL_BTN =
  "flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#12121a] px-3 py-2.5 text-left text-sm font-medium text-indigo-50/90 transition-colors";

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
        className={`${SOCIAL_BTN} hover:bg-[#03C75A]/10`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#03C75A] text-xs font-black text-white">
          N
        </span>
        <span className="flex-1 text-center pr-8">네이버 아이디로 로그인</span>
      </button>

      <button
        type="button"
        onClick={() => {
          window.location.href = oauthStartUrl("kakao", redirectTo);
        }}
        className={`${SOCIAL_BTN} hover:bg-[#FEE500]/[0.08]`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FEE500] text-xs font-black text-[#391B1B]">
          톡
        </span>
        <span className="flex-1 text-center pr-8">카카오계정으로 로그인</span>
      </button>

      {googleError ? (
        <p role="alert" className="px-1 text-xs text-rose-300">
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
