"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { PreviewBubble } from "@/components/home/preview-bubble";
import { useTypingReveal } from "@/components/home/use-typing-reveal";
import {
  fetchDemoReportSample,
  postDemoReportPreview,
} from "@/lib/demo-report-preview-api";
import { routes } from "@/lib/routes";

type ReportTab = "agent" | "custom";

type WeeklyReportPreviewWidgetProps = {
  className?: string;
  highlighted?: boolean;
  isLoggedIn?: boolean;
  /** 로그인 사용자 — 전체 주간 리포트 모달 열기 */
  onOpenFullReport?: () => void;
};

export function WeeklyReportPreviewWidget({
  className = "",
  highlighted = false,
  isLoggedIn = false,
  onOpenFullReport,
}: WeeklyReportPreviewWidgetProps) {
  const [tab, setTab] = useState<ReportTab>("agent");
  const [ui, setUi] = useState({
    loading: false,
    error: null as string | null,
    narrative: null as string | null,
    completedWork: "",
    meetings: "",
    pendingItems: "",
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const { visibleText, typing } = useTypingReveal(ui.narrative ?? "", {
    active: Boolean(ui.narrative) && !ui.loading,
    charIntervalMs: 24,
  });

  const handleSample = async () => {
    patchUi({ loading: true, error: null, narrative: null });
    try {
      const result = await fetchDemoReportSample();
      patchUi({ loading: false, narrative: result.narrative });
    } catch (err) {
      patchUi({
        loading: false,
        narrative: null,
        error: err instanceof Error ? err.message : "리포트를 불러오지 못했습니다.",
      });
    }
  };

  const handleCustomSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const completed_work = ui.completedWork.trim();
    const meetings = ui.meetings.trim();
    const pending_items = ui.pendingItems.trim();
    if (!completed_work && !meetings && !pending_items) {
      patchUi({
        error: "완료한 일, 미팅, 미완료 항목 중 하나 이상을 입력해 주세요.",
        narrative: null,
      });
      return;
    }
    patchUi({ loading: true, error: null, narrative: null });
    try {
      const result = await postDemoReportPreview({
        completed_work,
        meetings,
        pending_items,
      });
      patchUi({ loading: false, narrative: result.narrative });
    } catch (err) {
      patchUi({
        loading: false,
        narrative: null,
        error: err instanceof Error ? err.message : "리포트 생성에 실패했습니다.",
      });
    }
  };

  return (
    <section
      id="weekly-report-preview-widget"
      className={`moneo-glass scroll-mt-24 rounded-2xl border border-white/10 p-5 sm:p-6 ${
        highlighted ? "ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-[var(--moneo-bg,#0a0a12)]" : ""
      } ${className}`}
      aria-label="주간 업무 흐름 체험"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--moneo-gold,#D4AF37)]/85">
        try now · no login
      </p>
      <h2 className="mt-2 text-base font-semibold text-white sm:text-lg">
        이번 주 흐름, 직접 보여드릴까요?
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--moneo-muted)]">
        입력 없이도 에이전트가 한 주를 자연스럽게 정리해 보여줘요. 직접 적어 보는
        방식도 선택할 수 있어요.
      </p>

      <div
        className="mt-5 flex gap-1 rounded-xl border border-white/10 bg-black/20 p-1"
        role="tablist"
        aria-label="리포트 체험 방식"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "agent"}
          onClick={() => {
            setTab("agent");
            patchUi({ error: null });
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === "agent"
              ? "bg-indigo-500/25 text-indigo-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          에이전트가 정리해드려요
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "custom"}
          onClick={() => {
            setTab("custom");
            patchUi({ error: null });
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === "custom"
              ? "bg-indigo-500/25 text-indigo-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          직접 입력해볼게요
        </button>
      </div>

      {tab === "agent" ? (
        <div className="mt-4 space-y-4" role="tabpanel">
          <button
            type="button"
            onClick={() => void handleSample()}
            disabled={ui.loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-60 sm:w-auto"
          >
            {ui.loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            이번 주 흐름 보여주기
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleCustomSubmit(e)} className="mt-4 space-y-3" role="tabpanel">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-300">
              이번 주 완료한 일
            </span>
            <textarea
              value={ui.completedWork}
              onChange={(e) => patchUi({ completedWork: e.target.value, error: null })}
              placeholder="예: 결제 API 리팩터링 PR 머지, QA 버그 2건 수정"
              rows={2}
              maxLength={1500}
              className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400/50"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-300">
              주요 미팅·일정
            </span>
            <textarea
              value={ui.meetings}
              onChange={(e) => patchUi({ meetings: e.target.value, error: null })}
              placeholder="예: 화요일 스프린트 킥오프, 목요일 디자인 싱크 2건"
              rows={2}
              maxLength={1500}
              className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400/50"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-300">
              아직 처리 안 된 항목
            </span>
            <textarea
              value={ui.pendingItems}
              onChange={(e) => patchUi({ pendingItems: e.target.value, error: null })}
              placeholder="예: 고객사 A 회신 메일, Slack 긴급 스레드 1건"
              rows={2}
              maxLength={1500}
              className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400/50"
            />
          </label>
          <button
            type="submit"
            disabled={ui.loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-60 sm:w-auto"
          >
            {ui.loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            확인해보기
          </button>
        </form>
      )}

      {ui.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-300">
          {ui.error}
        </p>
      ) : null}

      {ui.loading || ui.narrative ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
          {ui.loading ? (
            <PreviewBubble role="agent" text="이번 주 흐름을 정리하는 중…" typing />
          ) : (
            <PreviewBubble role="agent" text={visibleText} typing={typing} />
          )}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--moneo-muted)]">
          {isLoggedIn
            ? "연동해 두면 매주 금요일, 진짜 내 한 주로 자동 채워져요."
            : "로그인하면 이게 당신의 진짜 한 주로 채워져요."}
        </p>
        {!isLoggedIn ? (
          <Link
            href={`${routes.oauth.signup}?next=${encodeURIComponent(routes.home)}`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--moneo-gold,#D4AF37)]/40 bg-[var(--moneo-gold,#D4AF37)]/10 px-4 py-2 text-sm font-medium text-[var(--moneo-gold,#D4AF37)] transition-colors hover:bg-[var(--moneo-gold,#D4AF37)]/20"
          >
            회원가입
          </Link>
        ) : (
          <button
            type="button"
            onClick={onOpenFullReport}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/25"
          >
            내 주간 리포트 보기
          </button>
        )}
      </div>
    </section>
  );
}
