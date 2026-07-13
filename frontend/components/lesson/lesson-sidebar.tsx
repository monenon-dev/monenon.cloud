"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

type LessonNavKey = "hub" | "titanic" | "crawling" | "samsung";
type CrawlingSubKey = "news" | "board" | "write";
type TitanicSubKey = "upload" | "walter" | "smith" | "vision";
type SamsungSubKey = "analysis" | "upload";

const TITANIC_SUB: { key: TitanicSubKey; label: string; href: string }[] = [
  { key: "upload", label: "1. 데이터 수집(CSV 업로드)", href: "/lesson/titanic-home" },
  { key: "walter", label: "2. 월터의 자기소개", href: "/lesson/titanic-home/passengers" },
  { key: "smith", label: "3. 스미스 선장 채팅", href: "/lesson/titanic-home/smith" },
  { key: "vision", label: "4. 레나 vision", href: "/star-craft/zerg/vision" },
];

const CRAWLING_SUB: { key: CrawlingSubKey; label: string; href: string }[] = [
  { key: "news", label: "1. 네이버 뉴스", href: "/lesson/crawling/news" },
  { key: "board", label: "2. 게시판 목록", href: "/lesson/crawling/board" },
  { key: "write", label: "3. 게시판 글쓰기", href: "/lesson/crawling/write" },
];

const SAMSUNG_SUB: { key: SamsungSubKey; label: string; href: string }[] = [
  { key: "analysis", label: "1. 삼성전자 분석", href: "/lesson/samsung" },
  { key: "upload", label: "2. 파일 업로드", href: "/lesson/samsung/upload" },
];

function resolveCrawlingSub(pathname: string): CrawlingSubKey | null {
  if (pathname.startsWith("/lesson/crawling/news")) return "news";
  if (pathname.startsWith("/lesson/crawling/board")) return "board";
  if (pathname.startsWith("/lesson/crawling/write")) return "write";
  return null;
}

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

export function LessonSidebar({ active = "hub" }: { active?: LessonNavKey }) {
  const pathname = usePathname();
  const crawlingSub = resolveCrawlingSub(pathname);
  const titanicSub = resolveTitanicSub(pathname);
  const samsungSub = resolveSamsungSub(pathname);
  const titanicOpen = active === "titanic" || titanicSub !== null;
  const crawlingOpen = active === "crawling" || crawlingSub !== null;
  const samsungOpen = active === "samsung" || samsungSub !== null;

  return (
    <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-white">
      <div className="px-6 py-8">
        <p className="text-xs font-medium text-gray-400">수업용</p>
        <nav className="mt-6 divide-y divide-gray-200">
          <Link
            href="/lesson"
            className={`flex items-center justify-between py-4 text-sm transition-colors ${
              active === "hub" ? "font-semibold text-gray-900" : "text-gray-700 hover:text-gray-900"
            }`}
          >
            <span>메인</span>
            <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
          </Link>

          <div className="py-2">
            <div
              className={`flex items-center justify-between py-2 text-sm ${
                titanicOpen ? "font-semibold text-gray-900" : "text-gray-700"
              }`}
            >
              <span>Lesson</span>
              {titanicOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
              )}
            </div>
            {titanicOpen ? (
              <ul className="mb-2 space-y-1 pl-2">
                {TITANIC_SUB.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-2 py-1.5 text-sm ${
                        titanicSub === item.key
                          ? "font-semibold text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link
                href="/lesson/titanic-home"
                className="mb-2 block py-1 pl-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Lesson 시작
              </Link>
            )}
          </div>

          <div className="py-2">
            <div
              className={`flex items-center justify-between py-2 text-sm ${
                crawlingOpen ? "font-semibold text-gray-900" : "text-gray-700"
              }`}
            >
              <span>크롤링</span>
              {crawlingOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
              )}
            </div>
            {crawlingOpen ? (
              <ul className="mb-2 space-y-1 pl-2">
                {CRAWLING_SUB.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-2 py-1.5 text-sm ${
                        crawlingSub === item.key
                          ? "font-semibold text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link
                href="/lesson/crawling/news"
                className="mb-2 block py-1 pl-2 text-sm text-gray-600 hover:text-gray-900"
              >
                크롤링 시작
              </Link>
            )}
          </div>

          <hr className="border-gray-200" />

          <div className="py-2">
            <div
              className={`flex items-center justify-between py-2 text-sm ${
                samsungOpen ? "font-semibold text-gray-900" : "text-gray-700"
              }`}
            >
              <span>삼성전자 분석</span>
              {samsungOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
              )}
            </div>
            {samsungOpen ? (
              <ul className="mb-2 space-y-1 pl-2">
                {SAMSUNG_SUB.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-2 py-1.5 text-sm ${
                        samsungSub === item.key
                          ? "font-semibold text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link
                href="/lesson/samsung"
                className="mb-2 block py-1 pl-2 text-sm text-gray-600 hover:text-gray-900"
              >
                삼성전자 분석 시작
              </Link>
            )}
          </div>
        </nav>
      </div>
      <div className="mt-auto border-t border-gray-200 px-6 py-4">
        <Link href="/" className="text-xs text-indigo-600 hover:underline">
          Monenon AI Agent 홈
        </Link>
      </div>
    </aside>
  );
}
