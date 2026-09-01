"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import type { PendingReview, TodayBriefing } from "@/lib/briefing-api";
import { submitBriefingReview } from "@/lib/briefing-api";

type BriefingPendingReviewCardProps = {
  briefingId: number;
  userId: number;
  pendingReview: PendingReview;
  apiBaseUrl?: string;
  onResolved: (updated: TodayBriefing) => void;
  className?: string;
};

/** 검증 실패로 보류된 문장 — 포함/제외 선택 UI. */
export function BriefingPendingReviewCard({
  briefingId,
  userId,
  pendingReview,
  apiBaseUrl,
  onResolved,
  className = "",
}: BriefingPendingReviewCardProps) {
  const [busy, setBusy] = useState<"include" | "exclude" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "include" | "exclude") => {
    setBusy(decision);
    setError(null);
    try {
      const updated = await submitBriefingReview(briefingId, userId, decision, {
        apiBaseUrl,
      });
      onResolved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검토 결과를 저장하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={`rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 dark:border-amber-500/30 dark:bg-amber-500/10 ${className}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-100">
          검토 필요
        </span>
        <span className="text-xs text-amber-900/70 dark:text-amber-100/70">
          {pendingReview.reason}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-amber-950/90 dark:text-amber-50/90 whitespace-pre-wrap">
        {pendingReview.content}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void decide("include")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy === "include" ? <Loader2 className="size-3.5 animate-spin" /> : null}
          포함하기
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void decide("exclude")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {busy === "exclude" ? <Loader2 className="size-3.5 animate-spin" /> : null}
          제외하기
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
