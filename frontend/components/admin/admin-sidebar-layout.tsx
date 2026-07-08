"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Shield, Users, type LucideIcon } from "lucide-react";

import { routes } from "@/lib/routes";

export type AdminSection = "dashboard" | "members" | "user_settings";

export const ADMIN_MENU: {
  id: AdminSection;
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}[] = [
  {
    id: "dashboard",
    href: routes.oauth.admin.dashboard,
    label: "운영 대시보드",
    icon: LayoutDashboard,
    match: (path) => path.startsWith(routes.oauth.admin.dashboard),
  },
  {
    id: "members",
    href: routes.oauth.admin.root,
    label: "회원 관리",
    icon: Users,
    match: (path) => path === routes.oauth.admin.root,
  },
  {
    id: "user_settings",
    href: routes.oauth.admin.userSettings,
    label: "취향 설정",
    icon: Settings,
    match: (path) => path.startsWith(routes.oauth.admin.userSettings),
  },
];

export const ADMIN_SECTION_TITLE: Record<AdminSection, string> = {
  dashboard: "운영 대시보드",
  members: "회원 관리",
  user_settings: "취향 설정",
};

type AdminSidebarLayoutProps = {
  activeSection: AdminSection;
  adminNickname: string;
  onLogout: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminSidebarLayout({
  activeSection,
  adminNickname,
  onLogout,
  headerActions,
  children,
}: AdminSidebarLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-[250px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <Link
            href="/"
            className="text-sm font-bold text-indigo-600 hover:opacity-90 dark:text-indigo-400"
          >
            Monenon AI Agent
          </Link>
        </div>

        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Shield size={18} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{adminNickname}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">관리자</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="관리자 메뉴">
          <ul className="space-y-1">
            {ADMIN_MENU.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-200 px-3 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <div className="ml-[250px] flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-8 py-5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">
              {ADMIN_SECTION_TITLE[activeSection]}
            </h1>
            {headerActions ? (
              <div className="flex flex-wrap items-center gap-2">{headerActions}</div>
            ) : null}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
