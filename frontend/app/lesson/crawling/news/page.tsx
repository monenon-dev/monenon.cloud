import { Newspaper } from "lucide-react";

import { CRAWLING_NEWS_DUMMY } from "@/lib/crawling-news-dummy";

export default function CrawlingNewsPage() {
  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-indigo-300/70">
        LESSON · CRAWLING
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">1. 네이버 뉴스</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--moneo-muted)]">
        네이버 뉴스 크롤링 결과를 카드 형태로 보여줍니다. 현재는 수업용 더미 데이터이며, 추후 실제
        크롤링 API 결과로 교체됩니다.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {CRAWLING_NEWS_DUMMY.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-2xl border border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] moneo-glass"
          >
            <div className="flex h-36 items-center justify-center bg-white/[0.03] text-indigo-300/40">
              <Newspaper className="h-10 w-10" strokeWidth={1.25} aria-hidden />
            </div>
            <div className="space-y-2 p-4">
              <p className="text-xs text-indigo-300/60">
                {item.category} · {item.source}
              </p>
              <h2 className="text-sm font-bold leading-snug text-white">{item.title}</h2>
              <p className="line-clamp-3 text-xs leading-relaxed text-[var(--moneo-muted)]">
                {item.summary}
              </p>
              <p className="pt-1 text-xs text-indigo-300/40">{item.date}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
