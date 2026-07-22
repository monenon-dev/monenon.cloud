import { routes } from "@/lib/routes";

export const LANDING_SECTION_IDS = {
  architecture: "landing-architecture",
} as const;

export type LandingScrollSectionId =
  (typeof LANDING_SECTION_IDS)[keyof typeof LANDING_SECTION_IDS];

/** scroll spy 대상 — 같은 페이지 내 앵커만 */
export const LANDING_SCROLL_SECTION_IDS: LandingScrollSectionId[] = [
  LANDING_SECTION_IDS.architecture,
];

export type LandingNavItem =
  | { label: string; kind: "scroll"; sectionId: LandingScrollSectionId }
  | { label: string; kind: "route"; href: string };

export const LANDING_NAV_ITEMS: LandingNavItem[] = [
  { label: "기능", kind: "route", href: routes.about },
  { label: "데모", kind: "route", href: routes.demo },
  {
    label: "아키텍처",
    kind: "scroll",
    sectionId: LANDING_SECTION_IDS.architecture,
  },
];

export function scrollToLandingSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
