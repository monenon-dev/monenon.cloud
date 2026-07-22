"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isLandingNavActive,
  LANDING_NAV_ITEMS,
  type LandingNavItem,
} from "@/lib/landing-sections";

type LandingHeaderNavProps = {
  variant: "inline" | "pills";
  className?: string;
};

export function LandingHeaderNav({ variant, className = "" }: LandingHeaderNavProps) {
  const pathname = usePathname();

  if (variant === "pills") {
    return (
      <nav
        aria-label="랜딩 페이지 섹션"
        className={`flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {LANDING_NAV_ITEMS.map((item) => (
          <LandingNavPill key={item.label} item={item} pathname={pathname} />
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
        <LandingNavLink key={item.label} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

function LandingNavLink({ item, pathname }: { item: LandingNavItem; pathname: string }) {
  const active = isLandingNavActive(item.href, pathname);

  return (
    <Link href={item.href} className={navLinkClass(active)} aria-current={active ? "page" : undefined}>
      {item.label}
    </Link>
  );
}

function LandingNavPill({ item, pathname }: { item: LandingNavItem; pathname: string }) {
  const active = isLandingNavActive(item.href, pathname);

  return (
    <Link
      href={item.href}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-400"
          : "border-white/10 bg-white/[0.04] text-gray-400 hover:border-indigo-400/30 hover:text-indigo-400"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {item.label}
    </Link>
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
