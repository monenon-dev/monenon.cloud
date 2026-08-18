"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, X } from "lucide-react";

import {
  fetchSavedMeetings,
  isValidMeetingTime,
  loadSavedMeetings,
  normalizeMeetingTime,
  persistSavedMeetings,
  postDemoCalendarCheck,
  saveMeetings,
  type DemoCalendarCheckResult,
  type DemoCalendarEventInput,
} from "@/lib/demo-calendar-check-api";
import { getAuthSession } from "@/lib/auth-api";
import { routes, mypageSectionUrl } from "@/lib/routes";
import { todaySeoulLabel } from "@/lib/seoul-date";

type Slot = { id: number; time: string; title: string };

const MAX_SLOTS = 10;

function emptySlot(id: number): Slot {
  return { id, time: "", title: "" };
}

function slotsFromEvents(events: DemoCalendarEventInput[], startId = 1): { slots: Slot[]; nextId: number } {
  if (events.length === 0) {
    return { slots: [emptySlot(startId)], nextId: startId + 1 };
  }
  const slots = events.slice(0, MAX_SLOTS).map((ev, i) => ({
    id: startId + i,
    time: ev.time,
    title: ev.title,
  }));
  return { slots, nextId: startId + slots.length };
}

function eventsFromSlots(slots: Slot[]): { events: DemoCalendarEventInput[]; error: string | null } {
  const events: DemoCalendarEventInput[] = [];
  for (const s of slots) {
    const time = s.time.trim();
    const title = s.title.trim();
    if (!time && !title) continue;
    if (!time || !title) {
      return { events: [], error: "입력 중인 일정에 시간과 제목을 모두 적어 주세요." };
    }
    if (!isValidMeetingTime(time)) {
      return {
        events: [],
        error: "시간은 24시간 형식(HH:MM)으로 입력해 주세요. 예: 09:30, 14:00",
      };
    }
    events.push({ time: normalizeMeetingTime(time), title });
    if (events.length >= MAX_SLOTS) break;
  }
  return { events, error: null };
}

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
    slots: [emptySlot(1)],
    nextId: 2,
    loading: false,
    saving: false,
    savedFlash: false,
    error: null as string | null,
    result: null as DemoCalendarCheckResult | null,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const local = loadSavedMeetings();
    const fromLocal = slotsFromEvents(local, 1);
    patchUi({ slots: fromLocal.slots, nextId: fromLocal.nextId });
    if (!isLoggedIn) return;
    const session = getAuthSession();
    if (!session) return;
    void fetchSavedMeetings(session.user_id)
      .then((events) => {
        if (events.length === 0) return;
        persistSavedMeetings(events);
        const fromApi = slotsFromEvents(events, 1);
        patchUi({ slots: fromApi.slots, nextId: fromApi.nextId, error: null });
      })
      .catch(() => {
        /* 로컬 저장분 유지 */
      });
  }, [isLoggedIn]);

  const updateSlot = (id: number, patch: Partial<Slot>) => {
    setUi((prev) => ({
      ...prev,
      error: null,
      slots: prev.slots.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)),
    }));
  };

  const addSlot = () => {
    setUi((prev) => {
      if (prev.slots.length >= MAX_SLOTS) return prev;
      return {
        ...prev,
        error: null,
        nextId: prev.nextId + 1,
        slots: [...prev.slots, emptySlot(prev.nextId)],
      };
    });
  };

  const removeSlot = (id: number) => {
    setUi((prev) => {
      if (prev.slots.length <= 1) {
        return { ...prev, error: null, slots: [emptySlot(prev.nextId)], nextId: prev.nextId + 1 };
      }
      return {
        ...prev,
        error: null,
        slots: prev.slots.filter((slot) => slot.id !== id),
      };
    });
  };

  const handleSave = async () => {
    const parsed = eventsFromSlots(ui.slots);
    if (parsed.error) {
      patchUi({ error: parsed.error, savedFlash: false });
      return;
    }
    const filled = parsed.events;
    persistSavedMeetings(filled);
    const session = isLoggedIn ? getAuthSession() : null;
    patchUi({ saving: true, error: null, savedFlash: false });
    try {
      if (session) {
        const saved = await saveMeetings(session.user_id, filled);
        persistSavedMeetings(saved);
        const next = slotsFromEvents(saved.length > 0 ? saved : filled, 1);
        patchUi({
          saving: false,
          savedFlash: true,
          slots: next.slots,
          nextId: next.nextId,
        });
      } else {
        patchUi({ saving: false, savedFlash: true });
      }
      window.setTimeout(() => patchUi({ savedFlash: false }), 1600);
    } catch (err) {
      patchUi({
        saving: false,
        error: err instanceof Error ? err.message : "저장에 실패했습니다.",
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = eventsFromSlots(ui.slots);
    if (parsed.error) {
      patchUi({ error: parsed.error, result: null });
      return;
    }
    const filled = parsed.events;
    if (filled.length === 0) {
      patchUi({ error: "시간과 제목을 하나 이상 입력해 주세요.", result: null });
      return;
    }
    patchUi({ loading: true, error: null });
    try {
      const result = await postDemoCalendarCheck(filled);
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
        오늘 가장 중요한 미팅을 적어보세요
      </h2>
      <p className="mt-1 text-sm font-medium text-indigo-200/85">{todaySeoulLabel()}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--moneo-muted)]">
        겹치거나 몰려 있으면, 로그인 없이도 바로 알려드려요. 시간은 24시간 형식(예: 09:30, 14:00)으로
        입력하고, 저장하면 새로고침 후에도 남아 있어요.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-3">
        {ui.slots.map((slot, index) => (
          <div
            key={slot.id}
            className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto]"
          >
            <label className="sr-only" htmlFor={`cal-slot-time-${slot.id}`}>
              일정 {index + 1} 시간
            </label>
            <input
              id={`cal-slot-time-${slot.id}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={slot.time}
              onChange={(e) => updateSlot(slot.id, { time: e.target.value })}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && isValidMeetingTime(value)) {
                  updateSlot(slot.id, { time: normalizeMeetingTime(value) });
                }
              }}
              placeholder="14:00"
              maxLength={5}
              className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-center text-sm tabular-nums text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400/50"
            />
            <label className="sr-only" htmlFor={`cal-slot-title-${slot.id}`}>
              일정 {index + 1} 제목
            </label>
            <input
              id={`cal-slot-title-${slot.id}`}
              type="text"
              value={slot.title}
              onChange={(e) => updateSlot(slot.id, { title: e.target.value })}
              placeholder="중요한 미팅"
              maxLength={120}
              className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400/50"
            />
            <button
              type="button"
              onClick={() => removeSlot(slot.id)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              aria-label={`일정 ${index + 1} 삭제`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={addSlot}
            disabled={ui.slots.length >= MAX_SLOTS}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden />
            미팅 추가
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={ui.saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-4 py-2.5 text-sm font-medium text-indigo-100 transition-colors hover:bg-indigo-500/25 disabled:opacity-60 sm:w-auto"
          >
            {ui.saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {ui.savedFlash ? "저장됨" : "저장"}
          </button>
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
            ? "연동해 두면 매일 아침 미팅 밀도와 겹침을 자동으로 확인해 드려요."
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
