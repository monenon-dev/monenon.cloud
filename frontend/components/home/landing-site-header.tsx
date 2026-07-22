"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";

import Logo from "@/components/brand/Logo";
import { LandingHeaderNav } from "@/components/home/landing-header-nav";
import { routes } from "@/lib/routes";

export type LandingAuthUser = { nickname: string; role: string };

const PAGE_SHELL = "mx-auto w-full max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8";

type LandingSiteHeaderProps = {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  authUser: LandingAuthUser | null;
  onLogout: () => void;
};

export function LandingSiteHeader({
  sidebarOpen,
  onSidebarToggle,
  authUser,
  onLogout,
}: LandingSiteHeaderProps) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-white/10 bg-[rgba(10,10,15,0.82)] backdrop-blur-md">
      <div className={PAGE_SHELL}>
        <div className="flex h-14 items-center justify-between gap-3 sm:h-16 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onSidebarToggle}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 p-2 text-indigo-100 hover:bg-white/5"
              aria-label={sidebarOpen ? "menu close" : "menu open"}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link
              href={routes.home}
              className="shrink-0 transition-opacity hover:opacity-90"
              aria-label="Moneo home"
            >
              <Logo variant="horizontal" theme="dark" size={36} showTagline />
            </Link>
            <LandingHeaderNav variant="inline" className="hidden md:flex" />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            {authUser ? (
              <>
                <Link
                  href={routes.oauth.mypage}
                  className="max-w-[80px] truncate px-1 text-sm font-medium text-indigo-300 hover:underline sm:max-w-none sm:px-2"
                >
                  {authUser.nickname}
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-medium text-indigo-100 transition-colors hover:bg-white/10 sm:px-3 sm:text-sm"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href={routes.oauth.login}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-medium text-indigo-100 transition-colors hover:bg-white/10 sm:px-3 sm:text-sm"
                >
                  로그인
                  <span className="hidden rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200/90 sm:inline-flex">
                    수업중
                  </span>
                </Link>
                <Link
                  href={routes.oauth.signup}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-2.5 py-2 text-xs font-medium text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-colors hover:bg-indigo-400 sm:px-3 sm:text-sm"
                >
                  회원가입
                  <span className="rounded border border-white/20 bg-white/10 px-1 py-0.5 text-[10px] font-medium text-white/90 sm:hidden">
                    수업
                  </span>
                </Link>
              </>
            )}
            {authUser ? (
              <Link
                href={routes.lesson.hub}
                className="hidden items-center rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-200/90 hover:bg-amber-400/15 sm:inline-flex"
              >
                수업중
              </Link>
            ) : null}
          </div>
        </div>

        <LandingHeaderNav variant="pills" className="hidden pb-2 sm:flex md:hidden sm:pb-2.5" />
      </div>
    </header>
  );
}

export { PAGE_SHELL as LANDING_PAGE_SHELL };
