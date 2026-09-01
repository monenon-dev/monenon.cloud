"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { LessonMenuNav, type LessonMenuNavActive, resolveLessonMenuActive } from "@/components/lesson/lesson-menu-nav";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getAuthSession, logoutAuthSession } from "@/lib/auth-api";
import { routes } from "@/lib/routes";

function LessonMenuSidebar({ active }: { active: LessonMenuNavActive }) {
  return (
    <div className="px-4 py-6">
      <p className="text-sm font-bold text-gray-900">Lesson 메뉴</p>
      <LessonMenuNav active={active} />
    </div>
  );
}

export function LessonTitanicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = resolveLessonMenuActive(pathname);
  const [authUser, setAuthUser] = useState<{ nickname: string } | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    setAuthUser(session ? { nickname: session.nickname } : null);
  }, []);

  const handleLogout = () => {
    logoutAuthSession(routes.oauth.login);
    setAuthUser(null);
  };

  return (
    <div className="min-h-dvh bg-white text-gray-900">
      <header className="shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur-md z-20">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 md:hidden"
                  aria-label="Lesson 메뉴 열기"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Lesson 메뉴</SheetTitle>
                  <SheetDescription className="sr-only">
                    Lesson 수업 메뉴 — 데이터 수집, 월터, 스미스, 레나 vision
                  </SheetDescription>
                </SheetHeader>
                <LessonMenuNav active={active} />
              </SheetContent>
            </Sheet>
            <Link
              href="/"
              className="shrink-0 text-left text-lg font-bold tracking-tight text-indigo-600 hover:opacity-90 transition-opacity"
            >
              Moneo
            </Link>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {authUser ? (
              <>
                <Link href={routes.oauth.mypage} className="text-sm font-medium text-indigo-600 px-2 hover:underline">
                  {authUser.nickname}님
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href={routes.oauth.login}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href={routes.oauth.signup}
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl">
        <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white md:block">
          <LessonMenuSidebar active={active} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
