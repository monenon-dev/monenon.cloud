"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import type { AuthSession } from "@/lib/auth-api";
import { resolvePostAuthRedirect } from "@/lib/mypage-preferences";

type GoogleAuthSectionProps = {
  redirectTo?: string;
  className?: string;
  /** true면 온보딩 완료 여부와 관계없이 redirectTo로 이동 (가입 직후 강제 온보딩 등) */
  forceRedirect?: boolean;
};

export function GoogleAuthSection({
  redirectTo = "/",
  className = "",
  forceRedirect = false,
}: GoogleAuthSectionProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = useCallback(
    (session: AuthSession) => {
      const target = forceRedirect
        ? redirectTo
        : resolvePostAuthRedirect(session.user_id, redirectTo);
      router.push(target);
      router.refresh();
    },
    [forceRedirect, redirectTo, router]
  );

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <div className={className}>
      {error && (
        <p
          role="alert"
          className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}
      <GoogleSignInButton onSuccess={handleSuccess} onError={handleError} />
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-gray-50/80 dark:bg-gray-900/40 px-2 text-gray-500 dark:text-gray-400">
            또는
          </span>
        </div>
      </div>
    </div>
  );
}
