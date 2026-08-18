"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  DOC_SUMMARY_MAX_CHARS,
  postDemoDocSummary,
  type DemoDocSummaryResult,
} from "@/lib/demo-doc-summary-api";
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
  const [ui, setUi] = useState({
    text: "",
    loading: false,
    error: null as string | null,
    result: null as DemoDocSummaryResult | null,
    tasteRevealed: false,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const handleTaste = () => {
    patchUi({ tasteRevealed: true, error: null, result: DEMO_DOC_SUMMARY_TASTE });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = ui.text.trim();
    if (!trimmed) {
      patchUi({ error: "텍스트를 붙여넣어 주세요.", result: null });
      return;
    }
    patchUi({ loading: true, error: null });
    try {
      const result = await postDemoDocSummary(trimmed);
      patchUi({ loading: false, result });
    } catch (err) {
      patchUi({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : "요약에 실패했습니다.",
      });
    }
  };

  const showResult = isLoggedIn ? ui.result : ui.tasteRevealed ? ui.result : null;

  return (
    <section
      id="doc-summary-widget"
      className={`moneo-glass scroll-mt-24 rounded-2xl border border-white/10 p-5 sm:p-6 ${
        highlighted ? "ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-[var(--moneo-bg,#0a0a12)]" : ""
      } ${className}`}
      aria-label="문서 요약 체험"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--moneo-gold,#D4AF37)]/85">
        {isLoggedIn ? "connected" : "try now · no login"}
      </p>
      <h2 className="mt-2 text-base font-semibold text-white sm:text-lg">
        문서·메모를 붙여넣으면 핵심만 정리해 드려요
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--moneo-muted)]">
        {isLoggedIn
          ? "회의록, 메모, 이메일 본문을 붙여넣으면 3줄 요약과 다음 할 일을 뽑아 드려요."
          : "로그인 전에는 샘플 회의록으로 맛만 볼 수 있어요. 로그인하면 내 문서·메일로 바꿔요."}
      </p>

      {isLoggedIn ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-3">
          <label className="sr-only" htmlFor="doc-summary-input">
            문서·메모 텍스트
          </label>
          <textarea
            id="doc-summary-input"
            value={ui.text}
            onChange={(e) => patchUi({ text: e.target.value, error: null })}
            placeholder="회의록, 메모, 이메일 등을 붙여넣어보세요"
            maxLength={10000}
            rows={6}
            className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400/50"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              {ui.text.length.toLocaleString()}자
              {ui.text.length > DOC_SUMMARY_MAX_CHARS
                ? ` · ${DOC_SUMMARY_MAX_CHARS.toLocaleString()}자까지만 요약해요`
                : ""}
            </p>
            <button
              type="submit"
              disabled={ui.loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-60 sm:w-auto"
            >
              {ui.loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              확인해보기
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-relaxed text-zinc-400 whitespace-pre-wrap">
            {DEMO_DOC_SUMMARY_TASTE_INPUT}
          </div>
          <button
            type="button"
            onClick={handleTaste}
            disabled={ui.tasteRevealed}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-60 sm:w-auto"
          >
            맛보기로 확인하기
          </button>
        </div>
      )}

      {ui.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-300">
          {ui.error}
        </p>
      ) : null}

      {showResult ? (
        <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
          {!isLoggedIn ? (
            <p className="mb-2 text-xs font-medium text-indigo-200/80">샘플 맛보기 결과</p>
          ) : null}
          {showResult.notice ? (
            <p className="mb-2 text-xs font-medium text-amber-200/90">{showResult.notice}</p>
          ) : null}
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-zinc-200">
            {showResult.summary_lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {showResult.next_action ? (
            <p className="mt-3 border-t border-white/10 pt-3 text-sm font-medium text-indigo-100">
              {showResult.next_action}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--moneo-muted)]">
          {isLoggedIn
            ? "연동해 두면 새 문서·메일이 올 때마다 자동으로 요약해 드려요."
            : "로그인하면 내 문서·메일로 바로 바꿔드려요."}
        </p>
        {!isLoggedIn ? (
          <Link
            href={`${routes.oauth.signup}?next=${encodeURIComponent(routes.mails.mailbox)}`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--moneo-gold,#D4AF37)]/40 bg-[var(--moneo-gold,#D4AF37)]/10 px-4 py-2 text-sm font-medium text-[var(--moneo-gold,#D4AF37)] transition-colors hover:bg-[var(--moneo-gold,#D4AF37)]/20"
          >
            회원가입
          </Link>
        ) : (
          <Link
            href={routes.mails.mailbox}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/25"
          >
            메일함 연동
          </Link>
        )}
      </div>
    </section>
  );
}
