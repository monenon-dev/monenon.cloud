"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  postDemoCalendarCheck,
  type DemoCalendarCheckResult,
} from "@/lib/demo-calendar-check-api";
import { routes, mypageSectionUrl } from "@/lib/routes";

type Slot = { time: string; title: string };

const DEFAULT_SLOTS: Slot[] = [
  { time: "14:00", title: "스탠드업" },
  { time: "14:30", title: "디자인 싱크" },
  { time: "15:00", title: "투자자 미팅 준비" },
];

type CalendarCheckWidgetProps = {
  className?: string;
  /** 로그인된 사용자면 CTA를 약하게 / 다르게 노출 */
  isLoggedIn?: boolean;
};

export function CalendarCheckWidget({
  className = "",
  isLoggedIn = false,
}: CalendarCheckWidgetProps) {
  const [ui, setUi] = useState({
    slots: DEFAULT_SLOTS,
    loading: false,
    error: null as string | null,
    result: null as DemoCalendarCheckResult | null,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const updateSlot = (index: number, patch: Partial<Slot>) => {
    setUi((prev) => ({
      ...prev,
      error: null,
      slots: prev.slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const filled = ui.slots
      .map((s) => ({ time: s.time.trim(), title: s.title.trim() }))
      .filter((s) => s.time && s.title);
    if (filled.length === 0) {
      patchUi({ error: "시간과 제목을 하나 이상 입력해 주세요.", result: null });
      return;
    }
    patchUi({ loading: true, error: null });
    try {
      const result = await postDemoCalendarCheck(filled.slice(0, 3));
      patchUi({ loading: false, result });
    } catch (err) {
      patchUi({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : "확인에 실패했습니다.",
      });
    }
  };

  return (
    <section
      className={`moneo-glass rounded-2xl border border-white/10 p-5 sm:p-6 ${className}`}
      aria-label="오늘 일정 미리 확인"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--moneo-gold,#D4AF37)]/85">
        try now · no login
      </p>
      <h2 className="mt-2 text-base font-semibold text-white sm:text-lg">
        오늘 일정을 3개까지 입력해보세요
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--moneo-muted)]">
        몰려 있거나 겹치면, 로그인 없이도 바로 알려드려요.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-3">
        {ui.slots.map((slot, index) => (
          <div
            key={index}
            className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)]"
          >
            <label className="sr-only" htmlFor={`cal-slot-time-${index}`}>
              일정 {index + 1} 시간
            </label>
            <input
              id={`cal-slot-time-${index}`}
              type="time"
              value={slot.time}
              onChange={(e) => updateSlot(index, { time: e.target.value })}
              className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-400/50"
            />
            <label className="sr-only" htmlFor={`cal-slot-title-${index}`}>
              일정 {index + 1} 제목
            </label>
            <input
              id={`cal-slot-title-${index}`}
              type="text"
              value={slot.title}
              onChange={(e) => updateSlot(index, { title: e.target.value })}
              placeholder={`일정 ${index + 1} 제목`}
              maxLength={120}
              className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400/50"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={ui.loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-60 sm:w-auto"
        >
          {ui.loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          확인해보기
        </button>
      </form>

      {ui.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-300">
          {ui.error}
        </p>
      ) : null}

      {ui.result ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 ${
            ui.result.status === "attention"
              ? "border-amber-400/35 bg-amber-500/10"
              : "border-emerald-400/30 bg-emerald-500/10"
          }`}
        >
          <p className="text-sm font-medium text-zinc-50">{ui.result.headline}</p>
          {ui.result.issues.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-zinc-300">
              {ui.result.issues.map((issue) => (
                <li key={`${issue.alert_type}-${issue.summary}`}>
                  {issue.detail || issue.summary}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--moneo-muted)]">
          {isLoggedIn
            ? "연동해 두면 매일 아침 일정 밀도와 겹침을 자동으로 확인해 드려요."
            : "로그인하면 매일 아침 이걸 자동으로 보내드려요."}
        </p>
        {!isLoggedIn ? (
          <Link
            href={`${routes.oauth.login}?next=${encodeURIComponent(mypageSectionUrl("notifications"))}`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--moneo-gold,#D4AF37)]/40 bg-[var(--moneo-gold,#D4AF37)]/10 px-4 py-2 text-sm font-medium text-[var(--moneo-gold,#D4AF37)] transition-colors hover:bg-[var(--moneo-gold,#D4AF37)]/20"
          >
            로그인 후 알림 설정
          </Link>
        ) : (
          <Link
            href={mypageSectionUrl("notifications")}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/25"
          >
            알림 설정
          </Link>
        )}
      </div>
    </section>
  );
}
