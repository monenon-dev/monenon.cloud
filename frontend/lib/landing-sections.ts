import { routes } from "@/lib/routes";

export const LANDING_SECTION_IDS = {
  features: "landing-features",
  architecture: "landing-architecture",
} as const;

export type LandingScrollSectionId =
  (typeof LANDING_SECTION_IDS)[keyof typeof LANDING_SECTION_IDS];

export const LANDING_SCROLL_SECTION_IDS: LandingScrollSectionId[] = [
  LANDING_SECTION_IDS.features,
  LANDING_SECTION_IDS.architecture,
];

export type LandingNavItem =
  | { label: string; kind: "scroll"; sectionId: LandingScrollSectionId }
  | { label: string; kind: "route"; href: string };

export const LANDING_NAV_ITEMS: LandingNavItem[] = [
  { label: "기능", kind: "scroll", sectionId: LANDING_SECTION_IDS.features },
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
