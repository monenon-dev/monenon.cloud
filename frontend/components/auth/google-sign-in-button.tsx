"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";

import { loginWithGoogle, saveAuthSession, type AuthSession } from "@/lib/auth-api";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleMomentNotification = {
  isDisplayMoment: () => boolean;
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
};

type GoogleIdApi = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: (momentListener?: (notification: GoogleMomentNotification) => void) => void;
  disableAutoSelect: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdApi;
      };
    };
  }
}

type GoogleSignInButtonProps = {
  onSuccess: (session: AuthSession) => void;
  onError?: (message: string) => void;
  /** social: 네이버·카카오와 동일한 full-width 버튼 (계정 미노출) */
  variant?: "social" | "embedded";
  className?: string;
};

export function GoogleSignInButton({
  onSuccess,
  onError,
  variant = "social",
  className = "",
}: GoogleSignInButtonProps) {
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [scriptReady, setScriptReady] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const handleCredential = useCallback(async (credential: string) => {
    try {
      const session = await loginWithGoogle(credential);
      const saved = { ...session, provider: "google" as const };
      saveAuthSession(saved);
      onSuccessRef.current(saved);
    } catch (err) {
      onErrorRef.current?.(
        err instanceof Error ? err.message : "Google 로그인에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scriptReady || !clientId || initialized) return;

    const googleId = window.google?.accounts?.id;
    if (!googleId) return;

    googleId.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: async (response) => {
        const credential = response.credential;
        if (!credential) {
          setLoading(false);
          onErrorRef.current?.("Google 로그인 정보를 받지 못했습니다.");
          return;
        }
        await handleCredential(credential);
      },
    });
    googleId.disableAutoSelect();
    setInitialized(true);
  }, [clientId, handleCredential, initialized, scriptReady]);

  const openGoogleSignIn = () => {
    const googleId = window.google?.accounts?.id;
    if (!googleId) {
      onErrorRef.current?.("Google 로그인을 준비 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setLoading(true);
    googleId.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        setLoading(false);
        const reason = notification.getNotDisplayedReason();
        if (reason === "suppressed_by_user" || reason === "opt_out_or_no_session") {
          onErrorRef.current?.("Google 로그인 창을 열 수 없습니다. 브라우저에서 팝업을 허용해 주세요.");
          return;
        }
        onErrorRef.current?.("Google 로그인을 표시할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      if (notification.isSkippedMoment()) {
        setLoading(false);
      }
      if (notification.isDismissedMoment()) {
        setLoading(false);
      }
    });
  };

  if (!clientId) {
    return (
      <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
        NEXT_PUBLIC_GOOGLE_CLIENT_ID 환경 변수를 설정해 주세요.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      {variant === "social" ? (
        <button
          type="button"
          onClick={openGoogleSignIn}
          disabled={loading || !initialized}
          className={`flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm font-medium text-gray-100 transition-colors hover:bg-[rgba(66,133,244,0.1)] disabled:opacity-60 ${className}`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-[#4285F4]">
            G
          </span>
          <span className="flex flex-1 items-center justify-center gap-2 pr-8">
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            구글 계정으로 로그인
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={openGoogleSignIn}
          disabled={loading || !initialized}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 ${className}`}
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Google로 로그인
        </button>
      )}
    </>
  );
}
