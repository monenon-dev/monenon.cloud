"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Palette,
  Settings2,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

export type MyPageSection = "dashboard" | "preferences" | "theme" | "account";

export const MYPAGE_MENU: { id: MyPageSection; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "preferences", label: "취향 설정", icon: Settings2 },
  { id: "theme", label: "테마 설정", icon: Palette },
  { id: "account", label: "계정 관리", icon: UserCircle },
];

export const MYPAGE_SECTION_TITLE: Record<MyPageSection, string> = {
  dashboard: "대시보드",
  preferences: "취향 설정",
  theme: "테마 설정",
  account: "계정 관리",
};

export const mypageCardClass =
  "rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm";

type MyPageSidebarLayoutProps = {
  activeSection: MyPageSection;
  onSectionChange: (section: MyPageSection) => void;
  profileSummary: {
    nickname: string;
    email: string;
    avatarSrc: string | null;
    initials: string;
  } | null;
  children: React.ReactNode;
};

export function MyPageSidebarLayout({
  activeSection,
  onSectionChange,
  profileSummary,
  children,
}: MyPageSidebarLayoutProps) {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <aside className="fixed top-0 left-0 z-30 flex h-screen w-[250px] shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="border-b border-gray-200 dark:border-gray-800 px-5 py-4">
          <Link
            href="/"
            className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-90"
          >
            Monenon AI Agent
          </Link>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">마이페이지</p>
        </div>

        {profileSummary && (
          <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {profileSummary.avatarSrc ? (
                <img
                  src={profileSummary.avatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-gray-500">
                  {profileSummary.initials}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profileSummary.nickname}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {profileSummary.email}
              </p>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {MYPAGE_MENU.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSectionChange(id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    activeSection === id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="ml-[250px] flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md px-8 py-5">
          <h1 className="text-2xl font-bold tracking-tight">
            {MYPAGE_SECTION_TITLE[activeSection]}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
