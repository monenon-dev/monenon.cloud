"use client";

import { useEffect, useState } from "react";

import type { LandingScrollSectionId } from "@/lib/landing-sections";

export function useLandingScrollSpy(sectionIds: readonly LandingScrollSectionId[]) {
  const [activeId, setActiveId] = useState<LandingScrollSectionId | null>(null);

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.intersectionRatio);
        });

        let bestId: LandingScrollSectionId | null = null;
        let bestRatio = 0;

        for (const id of sectionIds) {
          const ratio = ratios.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }

        setActiveId(bestRatio > 0.08 ? bestId : null);
      },
      {
        rootMargin: "-18% 0px -52% 0px",
        threshold: [0, 0.08, 0.2, 0.35, 0.5, 0.75, 1],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}
