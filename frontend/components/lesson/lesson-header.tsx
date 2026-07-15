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
    <header className="shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur-md z-20">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 md:hidden"
                aria-label="수업 메뉴 열기"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>수업용 메뉴</SheetTitle>
                <SheetDescription>타이타닉·크롤링 수업 메뉴</SheetDescription>
              </SheetHeader>
              <LessonSidebar active={active} />
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
          <Link
            href={routes.lesson.hub}
            className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 transition-colors"
          >
            수업중
          </Link>
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
  );
}
