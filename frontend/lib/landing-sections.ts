import { routes } from "@/lib/routes";

export type LandingNavItem = {
  label: string;
  href: string;
};

export const LANDING_NAV_ITEMS: LandingNavItem[] = [
  { label: "기능", href: routes.about },
  { label: "데모", href: routes.demo },
  { label: "아키텍처", href: routes.architecture },
];

export function isLandingNavActive(href: string, pathname: string): boolean {
  if (href === routes.home) return pathname === routes.home;
  return pathname === href || pathname.startsWith(`${href}/`);
}
