"use client";

import { DEMO_WEEKLY_REPORT_TASTE_NARRATIVE } from "@/lib/demo-taste-samples";

type WeeklyReportPreviewWidgetProps = {
  className?: string;
  highlighted?: boolean;
  isLoggedIn?: boolean;
  onOpenFullReport?: () => void;
};

export function WeeklyReportPreviewWidget({
  className = "",
  highlighted = false,
  onOpenFullReport,
}: WeeklyReportPreviewWidgetProps) {
  return (
    <section
      id="weekly-report-preview-widget"
      className={`moneo-glass scroll-mt-24 rounded-2xl border border-white/10 p-5 sm:p-6 ${
        highlighted ? "ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-[var(--moneo-bg,#0a0a12)]" : ""
      } ${className}`}
      aria-label="주간 리포트 미리보기"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--moneo-gold,#D4AF37)]/85">
        connected
      </p>
      <h2 className="mt-2 text-base font-semibold text-white sm:text-lg">
        이번 주 흐름, 직접 보여드릴까요?
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--moneo-muted)]">
        한 주가 끝나면 이런 식으로 흐름이 한 장으로 남아요.
      </p>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/25 px-4 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          이번 주 핵심 흐름
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-200">
          {DEMO_WEEKLY_REPORT_TASTE_NARRATIVE}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--moneo-muted)]">
          연동해 두면 매주 금요일, 진짜 내 한 주로 자동 채워져요.
        </p>
        <button
          type="button"
          onClick={onOpenFullReport}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/25"
        >
          내 주간 리포트 보기
        </button>
      </div>
    </section>
  );
}
