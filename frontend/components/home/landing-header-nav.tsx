"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLandingScrollSpy } from "@/hooks/use-landing-scroll-spy";
import {
  LANDING_NAV_ITEMS,
  LANDING_SCROLL_SECTION_IDS,
  scrollToLandingSection,
  type LandingNavItem,
  type LandingScrollSectionId,
} from "@/lib/landing-sections";

type LandingHeaderNavProps = {
  variant: "inline" | "pills";
  className?: string;
};

function isRouteNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LandingHeaderNav({ variant, className = "" }: LandingHeaderNavProps) {
  const pathname = usePathname();
  const activeScrollId = useLandingScrollSpy(LANDING_SCROLL_SECTION_IDS);

  if (variant === "pills") {
    return (
      <nav
        aria-label="랜딩 페이지 섹션"
        className={`flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {LANDING_NAV_ITEMS.map((item) => (
          <LandingNavPill
            key={item.label}
            item={item}
            pathname={pathname}
            activeScrollId={activeScrollId}
          />
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="랜딩 페이지 섹션"
      className={`ml-2 flex items-center gap-1 lg:gap-2 ${className}`}
    >
      {LANDING_NAV_ITEMS.map((item) => (
        <LandingNavLink
          key={item.label}
          item={item}
          pathname={pathname}
          activeScrollId={activeScrollId}
        />
      ))}
    </nav>
  );
}

function isNavItemActive(
  item: LandingNavItem,
  pathname: string,
  activeScrollId: LandingScrollSectionId | null
): boolean {
  if (item.kind === "route") return isRouteNavActive(item.href, pathname);
  return activeScrollId === item.sectionId;
}

function LandingNavLink({
  item,
  pathname,
  activeScrollId,
}: {
  item: LandingNavItem;
  pathname: string;
  activeScrollId: LandingScrollSectionId | null;
}) {
  const active = isNavItemActive(item, pathname, activeScrollId);
  const className = navLinkClass(active);

  if (item.kind === "route") {
    return (
      <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>
        {item.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => scrollToLandingSection(item.sectionId)}
      className={className}
      aria-current={active ? "true" : undefined}
    >
      {item.label}
    </button>
  );
}

function LandingNavPill({
  item,
  pathname,
  activeScrollId,
}: {
  item: LandingNavItem;
  pathname: string;
  activeScrollId: LandingScrollSectionId | null;
}) {
  const active = isNavItemActive(item, pathname, activeScrollId);
  const className = `shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-400"
      : "border-white/10 bg-white/[0.04] text-gray-400 hover:border-indigo-400/30 hover:text-indigo-400"
  }`;

  if (item.kind === "route") {
    return (
      <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>
        {item.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => scrollToLandingSection(item.sectionId)}
      className={className}
      aria-current={active ? "true" : undefined}
    >
      {item.label}
    </button>
  );
}

function navLinkClass(active: boolean) {
  return [
    "relative px-2.5 py-1 text-sm font-medium transition-colors",
    "after:absolute after:inset-x-2.5 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-indigo-500 after:transition-transform after:duration-200",
    active
      ? "text-indigo-500 after:scale-x-100"
      : "text-gray-400 hover:text-indigo-500 hover:after:scale-x-100",
  ].join(" ");
}
