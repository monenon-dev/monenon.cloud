import { Newspaper } from "lucide-react";

import { CRAWLING_NEWS_DUMMY } from "@/lib/crawling-news-dummy";

export default function CrawlingNewsPage() {
  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <p className="text-[11px] font-semibold tracking-widest text-gray-400">LESSON · CRAWLING</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">1. 네이버 뉴스</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600">
        네이버 뉴스 크롤링 결과를 카드 형태로 보여줍니다. 현재는 수업용 더미 데이터이며, 추후 실제
        크롤링 API 결과로 교체됩니다.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {CRAWLING_NEWS_DUMMY.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex h-36 items-center justify-center bg-gray-100 text-gray-400">
              <Newspaper className="h-10 w-10" strokeWidth={1.25} aria-hidden />
            </div>
            <div className="space-y-2 p-4">
              <p className="text-xs text-gray-500">
                {item.category} · {item.source}
              </p>
              <h2 className="text-sm font-bold leading-snug text-gray-900">{item.title}</h2>
              <p className="line-clamp-3 text-xs leading-relaxed text-gray-600">{item.summary}</p>
              <p className="pt-1 text-xs text-gray-400">{item.date}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
