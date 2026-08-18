"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";

import {
  DEMO_DOC_SUMMARY_TASTE,
  DEMO_DOC_SUMMARY_TASTE_INPUT,
} from "@/lib/demo-taste-samples";
import { routes } from "@/lib/routes";

type DocSummaryWidgetProps = {
  className?: string;
  highlighted?: boolean;
  isLoggedIn?: boolean;
};

export function DocSummaryWidget({
  className = "",
  highlighted = false,
  isLoggedIn = false,
}: DocSummaryWidgetProps) {
  const mailboxHref = isLoggedIn
    ? routes.mails.mailbox
    : `${routes.oauth.login}?next=${encodeURIComponent(routes.mails.mailbox)}`;

  return (
    <section
      id="doc-summary-widget"
      className={`moneo-glass scroll-mt-24 rounded-2xl border border-white/10 p-5 sm:p-6 ${
        highlighted ? "ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-[var(--moneo-bg,#0a0a12)]" : ""
      } ${className}`}
      aria-label="문서 요약 미리보기"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--moneo-gold,#D4AF37)]/85">
        connected
      </p>
      <h2 className="mt-2 text-base font-semibold text-white sm:text-lg">
        문서·메모를 붙여넣으면 핵심만 정리해 드려요
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--moneo-muted)]">
        회의록이 들어오면 핵심 요약과 다음 할 일이 이렇게 정리됩니다.
      </p>

      <div className="mt-5 grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            예시 원문
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {DEMO_DOC_SUMMARY_TASTE_INPUT}
          </p>
        </div>
        <div className="flex items-center justify-center text-indigo-300" aria-hidden>
          <ArrowDown className="size-5 md:hidden" />
          <ArrowRight className="hidden size-5 md:block" />
        </div>
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-200/80">
            핵심 3줄 요약
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-zinc-200">
            {DEMO_DOC_SUMMARY_TASTE.summary_lines.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
          {DEMO_DOC_SUMMARY_TASTE.next_action ? (
            <p className="mt-3 border-t border-white/10 pt-3 text-sm font-medium text-indigo-100">
              {DEMO_DOC_SUMMARY_TASTE.next_action}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--moneo-muted)]">
          연동해 두면 새 문서·메일이 올 때마다 자동으로 요약해 드려요.
        </p>
        <Link
          href={mailboxHref}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/25"
        >
          메일함 연동
        </Link>
      </div>
    </section>
  );
}
