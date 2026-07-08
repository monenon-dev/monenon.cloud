"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import type { AuthSession } from "@/lib/auth-api";

type GoogleAuthSectionProps = {
  redirectTo?: string;
  className?: string;
};

export function GoogleAuthSection({ redirectTo = "/", className = "" }: GoogleAuthSectionProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = useCallback(
    (_session: AuthSession) => {
      router.push(redirectTo);
      router.refresh();
    },
    [redirectTo, router]
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
