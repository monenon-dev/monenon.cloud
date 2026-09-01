"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/** 스크롤 진입 시 1회만 reveal — stagger는 step index × 150ms */
export function useInfographicReveal(threshold = 0.25) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export function infographicStepStyle(step: number, visible: boolean): CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translate(0, 0)" : "translate(-6px, 8px)",
    transition: `opacity 500ms ease-out ${step * 150}ms, transform 500ms ease-out ${step * 150}ms`,
  };
}
