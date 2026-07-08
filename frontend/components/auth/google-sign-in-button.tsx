"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";

import { loginWithGoogle, saveAuthSession, type AuthSession } from "@/lib/auth-api";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdApi = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: string;
      theme?: string;
      size?: string;
      text?: string;
      shape?: string;
      width?: number;
    }
  ) => void;
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
};

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [scriptReady, setScriptReady] = useState(false);
  const [rendered, setRendered] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!scriptReady || !clientId || !buttonRef.current || rendered) return;

    const googleId = window.google?.accounts?.id;
    if (!googleId) return;

    googleId.initialize({
      client_id: clientId,
      callback: async (response) => {
        const credential = response.credential;
        if (!credential) {
          onErrorRef.current?.("Google 로그인 정보를 받지 못했습니다.");
          return;
        }
        try {
          const session = await loginWithGoogle(credential);
          saveAuthSession(session);
          onSuccessRef.current(session);
        } catch (err) {
          onErrorRef.current?.(
            err instanceof Error ? err.message : "Google 로그인에 실패했습니다."
          );
        }
      },
    });

    googleId.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      width: 320,
    });
    setRendered(true);
  }, [clientId, rendered, scriptReady]);

  if (!clientId) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
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
      <div className="flex flex-col items-center gap-3">
        <div ref={buttonRef} className="min-h-11 flex items-center justify-center" />
        {!rendered && (
          <Loader2 className="animate-spin size-5 text-indigo-600" aria-label="Google 로그인 준비 중" />
        )}
      </div>
    </>
  );
}
