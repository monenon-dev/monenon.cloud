"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

type LessonNavKey = "hub" | "titanic" | "samsung";
type TitanicSubKey = "upload" | "walter" | "smith" | "vision";
type SamsungSubKey = "analysis" | "upload";

const TITANIC_SUB: { key: TitanicSubKey; label: string; href: string }[] = [
  { key: "upload", label: "1. 데이터 수집(CSV 업로드)", href: "/lesson/titanic-home" },
  { key: "walter", label: "2. 월터의 자기소개", href: "/lesson/titanic-home/passengers" },
  { key: "smith", label: "3. 스미스 선장 채팅", href: "/lesson/titanic-home/smith" },
  { key: "vision", label: "4. 레나 vision", href: "/star-craft/zerg/vision" },
];

const SAMSUNG_SUB: { key: SamsungSubKey; label: string; href: string }[] = [
  { key: "analysis", label: "1. 삼성전자 분석", href: "/lesson/samsung" },
  { key: "upload", label: "2. 파일 업로드", href: "/lesson/samsung/upload" },
];

function resolveTitanicSub(pathname: string): TitanicSubKey | null {
  if (pathname.startsWith("/star-craft/zerg/vision") || pathname.startsWith("/lesson/vision")) return "vision";
  if (pathname.startsWith("/lesson/titanic-home/smith") || pathname.startsWith("/titanic-home/smith")) {
    return "smith";
  }
  if (
    pathname.startsWith("/lesson/titanic-home/passengers") ||
    pathname.startsWith("/titanic-home/passengers")
  ) {
    return "walter";
  }
  if (pathname.startsWith("/lesson/titanic-home") || pathname.startsWith("/titanic-home")) {
    return "upload";
  }
  return null;
}

function resolveSamsungSub(pathname: string): SamsungSubKey | null {
  if (pathname.startsWith("/lesson/samsung/upload")) return "upload";
  if (pathname.startsWith("/lesson/samsung")) return "analysis";
  return null;
}

function navLinkClass(active: boolean) {
  return active
    ? "font-semibold text-white"
    : "text-indigo-100/75 hover:text-white";
}

function subLinkClass(active: boolean) {
  return `block rounded-md px-2 py-1.5 text-sm transition-colors ${
    active
      ? "bg-indigo-500/20 font-semibold text-indigo-100"
      : "text-[var(--moneo-muted)] hover:bg-white/[0.04] hover:text-indigo-100"
  }`;
}

export function LessonSidebar({ active = "hub" }: { active?: LessonNavKey }) {
  const pathname = usePathname();
  const titanicSub = resolveTitanicSub(pathname);
  const samsungSub = resolveSamsungSub(pathname);
  const titanicOpen = active === "titanic" || titanicSub !== null;
  const samsungOpen = active === "samsung" || samsungSub !== null;

  return (
    <aside className="flex h-full w-full flex-col bg-[rgba(10,10,15,0.55)] text-[var(--moneo-text)]">
      <div className="px-6 py-8">
        <p className="text-xs font-medium tracking-wider text-indigo-200/50">수업용</p>
        <nav className="mt-6 divide-y divide-[var(--moneo-border)]">
          <Link
            href="/lesson"
            className={`flex items-center justify-between py-4 text-sm transition-colors ${navLinkClass(active === "hub")}`}
          >
            <span>메인</span>
            <ChevronRight className="h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
          </Link>

          <div className="py-2">
            <div
              className={`flex items-center justify-between py-2 text-sm ${
                titanicOpen ? "font-semibold text-white" : "text-indigo-100/75"
              }`}
            >
              <span>Lesson</span>
              {titanicOpen ? (
                <ChevronDown className="h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
              )}
            </div>
            {titanicOpen ? (
              <ul className="mb-2 space-y-1 pl-2">
                {TITANIC_SUB.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className={subLinkClass(titanicSub === item.key)}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link
                href="/lesson/titanic-home"
                className="mb-2 block py-1 pl-2 text-sm text-[var(--moneo-muted)] hover:text-indigo-100"
              >
                Lesson 시작
              </Link>
            )}
          </div>

          <div className="py-2">
            <div
              className={`flex items-center justify-between py-2 text-sm ${
                samsungOpen ? "font-semibold text-white" : "text-indigo-100/75"
              }`}
            >
              <span>삼성전자 분석</span>
              {samsungOpen ? (
                <ChevronDown className="h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
              )}
            </div>
            {samsungOpen ? (
              <ul className="mb-2 space-y-1 pl-2">
                {SAMSUNG_SUB.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className={subLinkClass(samsungSub === item.key)}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link
                href="/lesson/samsung"
                className="mb-2 block py-1 pl-2 text-sm text-[var(--moneo-muted)] hover:text-indigo-100"
              >
                삼성전자 분석 시작
              </Link>
            )}
          </div>
        </nav>
      </div>
      <div className="mt-auto border-t border-[var(--moneo-border)] px-6 py-4">
        <Link href="/" className="text-xs text-indigo-300 hover:text-indigo-200 hover:underline">
          Moneo 홈
        </Link>
      </div>
    </aside>
  );
}
