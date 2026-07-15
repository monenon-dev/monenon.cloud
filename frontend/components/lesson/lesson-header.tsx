"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import { LessonSidebar } from "@/components/lesson/lesson-sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { clearAuthSession, getAuthSession } from "@/lib/auth-api";
import { routes } from "@/lib/routes";

type LessonNavKey = "hub" | "titanic" | "crawling" | "samsung";

export function LessonHeader({ active = "hub" }: { active?: LessonNavKey }) {
  const [authUser, setAuthUser] = useState<{ nickname: string } | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    setAuthUser(session ? { nickname: session.nickname } : null);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    setAuthUser(null);
  };

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-[var(--moneo-border)] bg-[rgba(10,10,15,0.85)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--moneo-border)] text-indigo-100/80 hover:bg-white/[0.04] md:hidden"
                aria-label="수업 메뉴 열기"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-[var(--moneo-border)] bg-[rgba(10,10,15,0.98)] p-0 text-[var(--moneo-text)]"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>수업용 메뉴</SheetTitle>
                <SheetDescription>타이타닉·크롤링 수업 메뉴</SheetDescription>
              </SheetHeader>
              <LessonSidebar active={active} />
            </SheetContent>
          </Sheet>
          <Link
            href="/"
            className="shrink-0 text-left text-lg font-bold tracking-tight text-indigo-300 hover:text-indigo-200 transition-colors"
          >
            Moneo
          </Link>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Link
            href={routes.lesson.hub}
            className="inline-flex items-center rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-200/90 hover:bg-amber-400/15 transition-colors"
          >
            수업중
          </Link>
          {authUser ? (
            <>
              <Link
                href={routes.oauth.mypage}
                className="px-2 text-sm font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
              >
                {authUser.nickname}님
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center rounded-lg border border-[var(--moneo-border)] bg-white/5 px-3 py-2 text-sm font-medium text-indigo-100 hover:bg-white/10 transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href={routes.oauth.login}
                className="inline-flex items-center rounded-lg border border-[var(--moneo-border)] bg-white/5 px-3 py-2 text-sm font-medium text-indigo-100 hover:bg-white/10 transition-colors"
              >
                로그인
              </Link>
              <Link
                href={routes.oauth.signup}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
