"use client";

import { useEffect, useRef, useState } from "react";

const INTRO_SEEN_KEY = "introSeen";
const FADE_MS = 800;
const BG = "#0A0A10";

type IntroUi = {
  /** checking: 세션/모션 확인 전(다크 덮개만) · playing · hidden */
  phase: "checking" | "playing" | "hidden";
  fading: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* private mode 등 — 무시 */
  }
}

/**
 * 랜딩 최상단 스플래시 — 히어로는 아래에서 이미 렌더, 이 오버레이만 fixed로 덮음.
 * framer-motion 미설치 → CSS opacity transition.
 */
export function IntroOverlay() {
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ui, setUi] = useState<IntroUi>({ phase: "checking", fading: false });

  useEffect(() => {
    if (prefersReducedMotion() || hasSeenIntro()) {
      setUi({ phase: "hidden", fading: false });
      return;
    }
    setUi({ phase: "playing", fading: false });
  }, []);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const beginDismiss = () => {
    setUi((prev) => {
      if (prev.phase === "hidden" || prev.fading) return prev;
      markIntroSeen();
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => {
        setUi({ phase: "hidden", fading: false });
      }, FADE_MS);
      return { ...prev, fading: true };
    });
  };

  if (ui.phase === "hidden") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        backgroundColor: BG,
        opacity: ui.fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: ui.fading ? "none" : "auto",
      }}
      role="dialog"
      aria-label="인트로"
      aria-modal="true"
    >
      {ui.phase === "playing" ? (
        <video
          className="h-full w-full object-contain"
          src="/intro.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={beginDismiss}
          onError={beginDismiss}
        />
      ) : null}
      {ui.phase === "playing" ? (
        <button
          type="button"
          onClick={beginDismiss}
          className="absolute bottom-6 right-6 rounded-lg border border-white/20 bg-black/40 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
        >
          건너뛰기
        </button>
      ) : null}
    </div>
  );
}
