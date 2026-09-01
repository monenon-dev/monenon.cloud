"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

type LessonNavKey = "hub" | "titanic" | "samsung" | "moneyball" | "crawling";
type TitanicSubKey = "upload" | "walter" | "smith" | "vision";
type SamsungSubKey = "analysis" | "upload";
type CrawlingSubKey = "news" | "board" | "write" | "scraper";

const MONEYBALL_HREF = "/lesson/moneyball";
const MONEYBALL_CHAT_HREF = "/lesson/moneyball/chat";

const CRAWLING_SUB: { key: CrawlingSubKey; label: string; href: string }[] = [
  { key: "news", label: "1. 네이버 뉴스", href: "/lesson/crawling/news" },
  { key: "board", label: "2. 게시판 목록", href: "/lesson/crawling/board" },
  { key: "write", label: "3. 게시판 글쓰기", href: "/lesson/crawling/write" },
  { key: "scraper", label: "4. 크롤러 / 스크래퍼", href: "/lesson/crawling/scraper" },
];

type MoneyballSubKey = "seed" | "chat";

const MONEYBALL_SUB: { key: MoneyballSubKey; label: string; href: string }[] = [
  { key: "seed", label: "1. 더미 데이터 시드", href: MONEYBALL_HREF },
  { key: "chat", label: "2. K-League DB 채팅", href: MONEYBALL_CHAT_HREF },
];

function resolveMoneyballSub(pathname: string): MoneyballSubKey | null {
  if (pathname.startsWith("/lesson/moneyball/chat")) return "chat";
  if (pathname.startsWith("/lesson/moneyball")) return "seed";
  return null;
}

function resolveCrawlingSub(pathname: string): CrawlingSubKey | null {
  if (pathname.startsWith("/lesson/crawling/scraper")) return "scraper";
  if (pathname.startsWith("/lesson/crawling/write")) return "write";
  if (pathname.startsWith("/lesson/crawling/board")) return "board";
  if (pathname.startsWith("/lesson/crawling/news")) return "news";
  return null;
}

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
  const moneyballSub = resolveMoneyballSub(pathname);
  const crawlingSub = resolveCrawlingSub(pathname);
  const titanicOpen = active === "titanic" || titanicSub !== null;
  const samsungOpen = active === "samsung" || samsungSub !== null;
  const moneyballOpen = active === "moneyball" || moneyballSub !== null;
  const crawlingOpen = active === "crawling" || crawlingSub !== null;

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
          <div className="py-2">
            <div
              className={`flex items-center justify-between py-2 text-sm ${
                moneyballOpen ? "font-semibold text-white" : "text-indigo-100/75"
              }`}
            >
              <span>Moneyball (K-League DB)</span>
              {moneyballOpen ? (
                <ChevronDown className="h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
              )}
            </div>
            {moneyballOpen ? (
              <ul className="mb-2 space-y-1 pl-2">
                {MONEYBALL_SUB.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className={subLinkClass(moneyballSub === item.key)}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link
                href={MONEYBALL_HREF}
                className="mb-2 block py-1 pl-2 text-sm text-[var(--moneo-muted)] hover:text-indigo-100"
              >
                Moneyball 시작
              </Link>
            )}
          </div>

          <div className="py-2">
            <div
              className={`flex items-center justify-between py-2 text-sm ${
                crawlingOpen ? "font-semibold text-white" : "text-indigo-100/75"
              }`}
            >
              <span>크롤링 실습</span>
              {crawlingOpen ? (
                <ChevronDown className="h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
              )}
            </div>
            {crawlingOpen ? (
              <ul className="mb-2 space-y-1 pl-2">
                {CRAWLING_SUB.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className={subLinkClass(crawlingSub === item.key)}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link
                href="/lesson/crawling/news"
                className="mb-2 block py-1 pl-2 text-sm text-[var(--moneo-muted)] hover:text-indigo-100"
              >
                크롤링 시작
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
