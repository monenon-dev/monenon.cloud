"use client";

import Link from "next/link";
import {
  Bell,
  LayoutDashboard,
  Settings2,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

export type MyPageSection = "dashboard" | "preferences" | "notifications" | "account";

export const MYPAGE_MENU: { id: MyPageSection; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "preferences", label: "취향 설정", icon: Settings2 },
  { id: "notifications", label: "브리핑 알림", icon: Bell },
  { id: "account", label: "계정 관리", icon: UserCircle },
];

export const MYPAGE_SECTION_TITLE: Record<MyPageSection, string> = {
  dashboard: "대시보드",
  preferences: "취향 설정",
  notifications: "브리핑 알림",
  account: "계정 관리",
};

export const mypageCardClass =
  "rounded-2xl border border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] p-6 moneo-glass";

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
    <div className="relative flex min-h-screen moneo-grid-bg text-[var(--moneo-text)]">
      <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <aside className="fixed top-0 left-0 z-30 flex h-screen w-[250px] shrink-0 flex-col border-r border-[var(--moneo-border)] bg-[rgba(10,10,15,0.92)] backdrop-blur-md">
        <div className="border-b border-[var(--moneo-border)] px-5 py-4">
          <Link
            href="/"
            className="text-sm font-bold text-indigo-300 hover:text-indigo-200"
          >
            Moneo
          </Link>
          <p className="mt-1 text-xs text-[var(--moneo-muted)]">마이페이지</p>
        </div>

        {profileSummary && (
          <div className="flex items-center gap-3 border-b border-[var(--moneo-border)] px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--moneo-border)] bg-white/5">
              {profileSummary.avatarSrc ? (
                <img
                  src={profileSummary.avatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-[var(--moneo-muted)]">
                  {profileSummary.initials}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{profileSummary.nickname}</p>
              <p className="truncate text-xs text-[var(--moneo-muted)]">
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
                      ? "bg-indigo-600 text-white shadow-[0_0_20px_var(--moneo-glow)]"
                      : "text-indigo-100/75 hover:bg-white/[0.04] hover:text-white"
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
        <header className="sticky top-0 z-20 border-b border-[var(--moneo-border)] bg-[rgba(10,10,15,0.85)] backdrop-blur-md px-8 py-5">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {MYPAGE_SECTION_TITLE[activeSection]}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
