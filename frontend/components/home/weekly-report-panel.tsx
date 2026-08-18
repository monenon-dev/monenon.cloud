"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

import type { WeeklyReport } from "@/lib/weekly-report-api";

type WeeklyReportPanelProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  report: WeeklyReport | null;
  onClose: () => void;
};

function severityLabel(severity: string): string {
  if (severity === "high") return "높음";
  if (severity === "low") return "낮음";
  return "보통";
}

function severityClass(severity: string): string {
  if (severity === "high") return "border-rose-400/40 bg-rose-500/15 text-rose-200";
  if (severity === "low") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-orange-400/35 bg-orange-500/15 text-orange-100";
}

function priorityClass(priority: string): string {
  if (priority === "high") return "text-rose-300";
  if (priority === "low") return "text-slate-300";
  return "text-indigo-200";
}

function renderMarkdownLite(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={i} className="mt-4 text-sm font-semibold text-white first:mt-0">
          {trimmed.slice(3)}
        </h3>
      );
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <li key={i} className="ml-4 list-disc text-sm leading-relaxed text-[var(--moneo-muted)]">
          {trimmed.slice(2)}
        </li>
      );
    }
    if (!trimmed) return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-sm leading-relaxed text-[var(--moneo-muted)]">
        {trimmed}
      </p>
    );
  });
}

export function WeeklyReportPanel({
  open,
  loading,
  error,
  report,
  onClose,
}: WeeklyReportPanelProps) {
  if (!open) return null;

  const hasRisks = Boolean(report?.risks?.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-report-title"
    >
      <div className="moneo-glass flex max-h-[min(90vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="weekly-report-title" className="text-lg font-semibold text-white">
                주간 업무 리포트
              </h2>
              {hasRisks ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/20 px-2.5 py-0.5 text-xs font-medium text-rose-100">
                  <AlertTriangle size={12} aria-hidden />
                  리스크 {report?.risks.length}건
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[var(--moneo-muted)]">
              최근 7일 daily_briefings 종합
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--moneo-muted)]">
              <Loader2 size={28} className="animate-spin text-indigo-400" />
              <p className="text-sm">주간 리포트를 생성하는 중…</p>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {!loading && !error && report ? (
            <div className="space-y-5">
              {hasRisks ? (
                <section aria-label="주요 리스크">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-200">
                    주요 리스크
                  </h3>
                  <div className="grid gap-2">
                    {report.risks.map((risk) => (
                      <article
                        key={risk.title}
                        className={`rounded-xl border px-4 py-3 ${severityClass(risk.severity)}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium">{risk.title}</h4>
                          <span className="text-xs opacity-80">
                            {severityLabel(risk.severity)}
                          </span>
                        </div>
                        {risk.detail ? (
                          <p className="mt-1 text-xs leading-relaxed opacity-90">
                            {risk.detail}
                          </p>
                        ) : null}
                        {risk.evidence_days?.length ? (
                          <p className="mt-2 text-[10px] opacity-70">
                            근거 일자: {risk.evidence_days.join(", ")}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <section
                aria-label="주간 요약"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-4"
              >
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-200">
                  주간 요약
                </h3>
                <div className="space-y-1">{renderMarkdownLite(report.summary)}</div>
              </section>

              {report.next_actions.length > 0 ? (
                <section aria-label="다음 주 액션">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-200">
                    다음 주 액션
                  </h3>
                  <div className="grid gap-2">
                    {report.next_actions.map((action) => (
                      <article
                        key={action.title}
                        className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium text-white">{action.title}</h4>
                          <span className={`text-xs ${priorityClass(action.priority)}`}>
                            {action.priority === "high"
                              ? "높음"
                              : action.priority === "low"
                                ? "낮음"
                                : "보통"}
                          </span>
                        </div>
                        {action.detail ? (
                          <p className="mt-1 text-xs leading-relaxed text-[var(--moneo-muted)]">
                            {action.detail}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
