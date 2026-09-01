"use client";

import { useEffect, useState } from "react";

type UseTypingRevealOptions = {
  /** false면 타이핑 없이 전체 텍스트 표시 */
  active?: boolean;
  charIntervalMs?: number;
};

export function useTypingReveal(text: string, options?: UseTypingRevealOptions) {
  const active = options?.active ?? true;
  const charIntervalMs = options?.charIntervalMs ?? 28;
  const [chars, setChars] = useState(0);

  useEffect(() => {
    setChars(0);
  }, [text]);

  useEffect(() => {
    if (!active || !text || chars >= text.length) return;
    const id = window.setTimeout(() => setChars((prev) => prev + 1), charIntervalMs);
    return () => window.clearTimeout(id);
  }, [active, chars, text, charIntervalMs]);

  return {
    visibleText: active ? text.slice(0, chars) : text,
    typing: active && chars < text.length,
    done: Boolean(text) && (!active || chars >= text.length),
  };
}
