"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Mail } from "lucide-react";

import { routes } from "@/lib/routes";

const ITEMS = [
  { href: routes.mails.mail, label: "메일관리", icon: Mail },
  { href: routes.lifestyle.schedule, label: "일정관리", icon: CalendarDays },
] as const;

export function ManagementNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="메일·일정 관리"
      className="flex rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-1 mb-6"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
