"use client";

import { useState, FormEvent } from "react";
import { Globe, Bot, Loader2, ChevronRight, Search, Terminal } from "lucide-react";

type TabKey = "crawler" | "scraper";

interface RunResult {
  status: "idle" | "loading" | "success" | "error";
  output: string;
}

function ResultBox({ result }: { result: RunResult }) {
  if (result.status === "idle") return null;
  if (result.status === "loading") {
    return (
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-sm text-indigo-300">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        <span>실행 중…</span>
      </div>
    );
  }
  if (result.status === "error") {
    return (
      <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-red-400">오류</p>
        <pre className="whitespace-pre-wrap break-words text-sm text-red-300">{result.output}</pre>
      </div>
    );
  }
  return (
    <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-emerald-400">결과</p>
      <pre className="whitespace-pre-wrap break-words text-sm text-emerald-200">{result.output}</pre>
    </div>
  );
}

function CrawlerPanel() {
  const [result, setResult] = useState<RunResult>({ status: "idle", output: "" });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const url = String(fd.get("url") ?? "").trim();
    const command = String(fd.get("command") ?? "").trim();

    if (!url) return;

    setResult({ status: "loading", output: "" });
    try {
      const res = await fetch("/api/lesson/crawling/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "crawler", url, command }),
      });
      const data = (await res.json()) as { output?: string; error?: string };
      if (!res.ok || data.error) {
        setResult({ status: "error", output: data.error ?? "알 수 없는 오류가 발생했습니다." });
      } else {
        setResult({ status: "success", output: data.output ?? "(결과 없음)" });
      }
    } catch (err) {
      setResult({
        status: "error",
        output: err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.",
      });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] p-4 moneo-glass">
        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-white">웹 크롤러</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--moneo-muted)]">
            사이트 주소와 자연어 명령어를 입력하면 해당 페이지를 순회하며 데이터를 수집합니다.
            링크를 따라가며 여러 페이지를 탐색합니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="crawler-url" className="mb-2 block text-sm font-medium text-indigo-100">
            사이트 주소
          </label>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--moneo-muted)]" aria-hidden />
            <input
              id="crawler-url"
              name="url"
              type="url"
              required
              placeholder="https://example.com"
              className="w-full rounded-xl border border-[var(--moneo-border)] bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-white placeholder-[var(--moneo-muted)] outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <div>
          <label htmlFor="crawler-command" className="mb-2 block text-sm font-medium text-indigo-100">
            자연어 명령어
          </label>
          <div className="relative">
            <Bot className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
            <textarea
              id="crawler-command"
              name="command"
              rows={3}
              placeholder="예: 메인 페이지에서 모든 기사 제목과 링크를 가져와줘"
              className="w-full resize-y rounded-xl border border-[var(--moneo-border)] bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-white placeholder-[var(--moneo-muted)] outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--moneo-muted)]">
            원하는 작업을 자연어로 설명하면 AI가 이해하고 실행합니다.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60"
        >
          <Search className="h-4 w-4" aria-hidden />
          크롤링 실행
        </button>
      </form>

      <ResultBox result={result} />
    </div>
  );
}

function ScraperPanel() {
  const [result, setResult] = useState<RunResult>({ status: "idle", output: "" });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const url = String(fd.get("url") ?? "").trim();
    const command = String(fd.get("command") ?? "").trim();

    if (!url) return;

    setResult({ status: "loading", output: "" });
    try {
      const res = await fetch("/api/lesson/crawling/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scraper", url, command }),
      });
      const data = (await res.json()) as { output?: string; error?: string };
      if (!res.ok || data.error) {
        setResult({ status: "error", output: data.error ?? "알 수 없는 오류가 발생했습니다." });
      } else {
        setResult({ status: "success", output: data.output ?? "(결과 없음)" });
      }
    } catch (err) {
      setResult({
        status: "error",
        output: err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.",
      });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] p-4 moneo-glass">
        <Terminal className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-white">웹 스크래퍼</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--moneo-muted)]">
            특정 URL 하나의 페이지에서 원하는 정보를 정밀하게 추출합니다.
            단일 페이지 내 구조화된 데이터(테이블, 목록 등)를 가져옵니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="scraper-url" className="mb-2 block text-sm font-medium text-indigo-100">
            사이트 주소
          </label>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--moneo-muted)]" aria-hidden />
            <input
              id="scraper-url"
              name="url"
              type="url"
              required
              placeholder="https://example.com/page"
              className="w-full rounded-xl border border-[var(--moneo-border)] bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-white placeholder-[var(--moneo-muted)] outline-none transition focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>
        </div>

        <div>
          <label htmlFor="scraper-command" className="mb-2 block text-sm font-medium text-indigo-100">
            자연어 명령어
          </label>
          <div className="relative">
            <Bot className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--moneo-muted)]" aria-hidden />
            <textarea
              id="scraper-command"
              name="command"
              rows={3}
              placeholder="예: 이 페이지에서 상품 이름, 가격, 평점을 표 형식으로 추출해줘"
              className="w-full resize-y rounded-xl border border-[var(--moneo-border)] bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-white placeholder-[var(--moneo-muted)] outline-none transition focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--moneo-muted)]">
            추출할 데이터와 형식을 자연어로 설명하면 AI가 이해하고 실행합니다.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 active:bg-violet-700 disabled:opacity-60"
        >
          <Terminal className="h-4 w-4" aria-hidden />
          스크래핑 실행
        </button>
      </form>

      <ResultBox result={result} />
    </div>
  );
}

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "crawler", label: "크롤러 (Crawler)", icon: Globe },
  { key: "scraper", label: "스크래퍼 (Scraper)", icon: Terminal },
];

export default function CrawlingScraperPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("crawler");

  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-indigo-300/70">
        LESSON · CRAWLING
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">4. 크롤러 / 스크래퍼</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--moneo-muted)]">
        사이트 주소와 자연어 명령어를 입력하면 AI가 이해하고 웹 데이터를 수집합니다.
      </p>

      <div className="mt-10 max-w-2xl">
        <div className="flex gap-1 rounded-xl border border-[var(--moneo-border)] bg-white/[0.03] p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === key
                  ? key === "crawler"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-violet-600 text-white shadow-sm"
                  : "text-[var(--moneo-muted)] hover:bg-white/[0.04] hover:text-indigo-100"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-1 flex items-center gap-1 px-1">
          <ChevronRight className="h-3 w-3 text-[var(--moneo-muted)]" aria-hidden />
          <p className="text-xs text-[var(--moneo-muted)]">
            {activeTab === "crawler"
              ? "여러 페이지를 순회하며 데이터를 수집합니다"
              : "단일 페이지에서 정보를 정밀하게 추출합니다"}
          </p>
        </div>

        <div className="mt-6">
          {activeTab === "crawler" ? <CrawlerPanel /> : <ScraperPanel />}
        </div>
      </div>
    </div>
  );
}
