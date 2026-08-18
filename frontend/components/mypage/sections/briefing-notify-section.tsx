"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, Check, ChevronDown, Loader2, Mail, Sunrise } from "lucide-react";

import { mypageCardClass } from "@/components/mypage/mypage-sidebar-layout";
import { getApiBaseUrl } from "@/lib/api-base";
import { getChatUserId } from "@/lib/chat-user";
import {
  fetchIntegrations,
  integrationOAuthStartUrl,
  patchBriefingNotify,
} from "@/lib/integrations-api";
import {
  fetchNotificationSettings,
  patchNotificationSettings,
} from "@/lib/notification-settings-api";
import { fetchRecentAlerts, type RecentAlertItem } from "@/lib/proactive-alerts-api";
import { mypageSectionUrl } from "@/lib/routes";

type SavingKey =
  | "morningNotify"
  | "alertCalendarDensity"
  | "alertUrgentMessages"
  | "briefingTime"
  | "densityThreshold"
  | "activeHours";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const END_HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

const DENSITY_OPTIONS: { value: 2 | 3 | 4; label: string }[] = [
  { value: 4, label: "느슨하게 (4개+)" },
  { value: 3, label: "보통 (3개+)" },
  { value: 2, label: "예민하게 (2개+)" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function BoundedSelect({
  id,
  label,
  value,
  options,
  format,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  options: number[];
  format: (n: number) => string;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [menu, setMenu] = useState({
    open: false,
    top: 0,
    left: 0,
    width: 72,
  });

  const closeMenu = () => setMenu((prev) => ({ ...prev, open: false }));

  const openMenu = () => {
    if (disabled) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxH = 192;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < 140 && rect.top > spaceBelow;
    const top = openUp ? Math.max(8, rect.top - maxH - 4) : rect.bottom + 4;
    setMenu({
      open: true,
      top,
      left: rect.left,
      width: Math.max(rect.width, 72),
    });
  };

  useEffect(() => {
    if (!menu.open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (btnRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    };
    const onWindowScroll = (event: Event) => {
      if (listRef.current?.contains(event.target as Node)) return;
      closeMenu();
    };
    const pointerTimer = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointer);
    }, 0);
    window.addEventListener("scroll", onWindowScroll, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.clearTimeout(pointerTimer);
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", onWindowScroll, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menu.open]);

  useEffect(() => {
    if (!menu.open) return;
    const list = listRef.current;
    const selected = list?.querySelector("[data-selected=true]");
    if (!list || !(selected instanceof HTMLElement)) return;
    const offset =
      selected.offsetTop - list.clientHeight / 2 + selected.clientHeight / 2;
    list.scrollTop = Math.max(0, offset);
  }, [menu.open, value]);

  return (
    <>
      <button
        ref={btnRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menu.open}
        aria-label={label}
        disabled={disabled}
        onClick={() => (menu.open ? closeMenu() : openMenu())}
        className="inline-flex h-8 min-w-[4.5rem] items-center justify-between gap-1 rounded-lg border border-white/25 bg-white/[0.08] px-2.5 text-sm tabular-nums text-white outline-none transition-colors hover:border-indigo-400/50 focus-visible:border-indigo-500 disabled:opacity-40"
      >
        {format(value)}
        <ChevronDown className="size-3.5 shrink-0 text-white/70" aria-hidden />
      </button>
      {menu.open
        ? createPortal(
            <ul
              ref={listRef}
              role="listbox"
              aria-label={label}
              style={{ top: menu.top, left: menu.left, minWidth: menu.width }}
              className="fixed z-[80] max-h-48 overflow-y-auto rounded-lg border border-white/20 bg-[#16121f] py-1 shadow-xl"
            >
              {options.map((n) => {
                const selected = n === value;
                return (
                  <li key={n}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-selected={selected || undefined}
                      className={`flex w-full px-3 py-1.5 text-left text-sm tabular-nums ${
                        selected
                          ? "bg-indigo-600 text-white"
                          : "text-[#e8e8ef] hover:bg-indigo-600/80 hover:text-white"
                      }`}
                      onClick={() => {
                        onChange(n);
                        closeMenu();
                      }}
                    >
                      {format(n)}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body
          )
        : null}
    </>
  );
}

function formatSentAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function alertIcon(alertType: string) {
  if (alertType === "morning_briefing") return Sunrise;
  if (alertType === "gmail_deadline" || alertType === "slack_urgent") return Mail;
  return CalendarClock;
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
        checked ? "bg-indigo-600" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
          checked ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function BriefingNotifySection() {
  const [ui, setUi] = useState({
    loading: true,
    error: null as string | null,
    savingKey: null as SavingKey | null,
    savedFlash: false,
    morningNotify: false,
    alertCalendarDensity: false,
    alertUrgentMessages: false,
    briefingHour: 7,
    briefingMinute: 0,
    densityThreshold: 3 as 2 | 3 | 4,
    activeHoursStart: 8,
    activeHoursEnd: 20,
    gmailConnected: false,
    recent: [] as RecentAlertItem[],
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const load = useCallback(async () => {
    const userId = getChatUserId();
    if (!userId) {
      patchUi({ loading: false, error: "로그인이 필요합니다." });
      return;
    }
    patchUi({ loading: true, error: null });
    try {
      const base = getApiBaseUrl();
      const [notify, integrations, recent] = await Promise.all([
        fetchNotificationSettings(userId, base),
        fetchIntegrations(userId, base),
        fetchRecentAlerts(userId, base).catch(() => ({ items: [] as RecentAlertItem[] })),
      ]);
      const gmail = integrations.integrations.find((i) => i.provider === "gmail");
      const density =
        notify.density_threshold === 2 || notify.density_threshold === 4
          ? notify.density_threshold
          : 3;
      patchUi({
        loading: false,
        morningNotify: integrations.briefing_notify,
        alertCalendarDensity: notify.alert_calendar_density,
        alertUrgentMessages: notify.alert_urgent_messages,
        briefingHour: notify.briefing_hour,
        briefingMinute: notify.briefing_minute,
        densityThreshold: density,
        activeHoursStart: notify.active_hours_start,
        activeHoursEnd: notify.active_hours_end,
        gmailConnected: Boolean(gmail?.connected && gmail.enabled),
        recent: recent.items,
      });
    } catch (e) {
      patchUi({
        loading: false,
        error: e instanceof Error ? e.message : "설정을 불러오지 못했습니다.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flashSaved = () => {
    patchUi({ savedFlash: true, savingKey: null });
    window.setTimeout(() => patchUi({ savedFlash: false }), 1200);
  };

  const toggleMorning = async () => {
    const userId = getChatUserId();
    if (!userId || ui.savingKey) return;
    const next = !ui.morningNotify;
    patchUi({ morningNotify: next, savingKey: "morningNotify", error: null });
    try {
      await patchBriefingNotify(userId, next, getApiBaseUrl());
      flashSaved();
    } catch (e) {
      patchUi({
        morningNotify: !next,
        savingKey: null,
        error: e instanceof Error ? e.message : "저장 실패",
      });
    }
  };

  const toggleNotifyField = async (
    key: "alertCalendarDensity" | "alertUrgentMessages"
  ) => {
    const userId = getChatUserId();
    if (!userId || ui.savingKey) return;
    const current = ui[key];
    const next = !current;
    const apiKey =
      key === "alertCalendarDensity"
        ? "alert_calendar_density"
        : "alert_urgent_messages";
    patchUi({ [key]: next, savingKey: key, error: null } as Partial<typeof ui>);
    try {
      await patchNotificationSettings(
        userId,
        { [apiKey]: next },
        getApiBaseUrl()
      );
      flashSaved();
    } catch (e) {
      patchUi({
        [key]: current,
        savingKey: null,
        error: e instanceof Error ? e.message : "저장 실패",
      } as Partial<typeof ui>);
    }
  };

  const savePrefs = async (
    savingKey: SavingKey,
    patch: Parameters<typeof patchNotificationSettings>[1],
    revert: Partial<typeof ui>
  ) => {
    const userId = getChatUserId();
    if (!userId || ui.savingKey) return;
    patchUi({ savingKey, error: null });
    try {
      await patchNotificationSettings(userId, patch, getApiBaseUrl());
      flashSaved();
    } catch (e) {
      patchUi({
        ...revert,
        savingKey: null,
        error: e instanceof Error ? e.message : "저장 실패",
      });
    }
  };

  const changeBriefingTime = (hour: number, minute: number) => {
    const prevHour = ui.briefingHour;
    const prevMinute = ui.briefingMinute;
    if (hour === prevHour && minute === prevMinute) return;
    patchUi({ briefingHour: hour, briefingMinute: minute });
    void savePrefs(
      "briefingTime",
      { briefing_hour: hour, briefing_minute: minute },
      { briefingHour: prevHour, briefingMinute: prevMinute }
    );
  };

  const changeDensity = (value: 2 | 3 | 4) => {
    if (value === ui.densityThreshold) return;
    const prev = ui.densityThreshold;
    patchUi({ densityThreshold: value });
    void savePrefs(
      "densityThreshold",
      { density_threshold: value },
      { densityThreshold: prev }
    );
  };

  const changeActiveHours = (start: number, end: number) => {
    const prevStart = ui.activeHoursStart;
    const prevEnd = ui.activeHoursEnd;
    if (start === prevStart && end === prevEnd) return;
    patchUi({ activeHoursStart: start, activeHoursEnd: end });
    void savePrefs(
      "activeHours",
      { active_hours_start: start, active_hours_end: end },
      { activeHoursStart: prevStart, activeHoursEnd: prevEnd }
    );
  };

  const startGmailOAuth = () => {
    const userId = getChatUserId();
    if (!userId) return;
    window.location.href = integrationOAuthStartUrl(
      "gmail",
      userId,
      mypageSectionUrl("notifications")
    );
  };

  if (ui.loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-indigo-400" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ui.error ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {ui.error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">브리핑 알림</h2>
          <p className="mt-1 text-sm text-[var(--moneo-muted)]">
            토글을 바꾸면 바로 저장됩니다. 알림은 Gmail 연동 후 받을 수 있어요.
          </p>
        </div>
        {ui.savingKey ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-indigo-200">
            <Loader2 className="size-3.5 animate-spin" />
            저장 중
          </span>
        ) : ui.savedFlash ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
            <Check className="size-3.5" />
            저장됨
          </span>
        ) : null}
      </div>

      <section className={mypageCardClass}>
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">매일 아침 브리핑 받기</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--moneo-muted)]">
                  연동된 Gmail로 요약과 브리핑 링크를 보냅니다.
                </p>
              </div>
              <ToggleSwitch
                checked={ui.morningNotify}
                disabled={ui.savingKey === "morningNotify"}
                onChange={() => void toggleMorning()}
                label="매일 아침 브리핑 받기"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--moneo-muted)]">받을 시간</span>
              <BoundedSelect
                id="briefing-hour"
                label="시"
                value={ui.briefingHour}
                options={HOURS}
                format={pad2}
                disabled={Boolean(ui.savingKey)}
                onChange={(hour) => changeBriefingTime(hour, ui.briefingMinute)}
              />
              <span className="text-sm text-white/70">:</span>
              <BoundedSelect
                id="briefing-minute"
                label="분"
                value={ui.briefingMinute}
                options={MINUTES}
                format={pad2}
                disabled={Boolean(ui.savingKey)}
                onChange={(minute) => changeBriefingTime(ui.briefingHour, minute)}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-white/10 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">일정이 몰리면 미리 알려주기</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--moneo-muted)]">
                  미팅이 몰리거나 일정이 겹치면 미리 알림을 보냅니다.
                </p>
              </div>
              <ToggleSwitch
                checked={ui.alertCalendarDensity}
                disabled={ui.savingKey === "alertCalendarDensity"}
                onChange={() => void toggleNotifyField("alertCalendarDensity")}
                label="일정이 몰리면 미리 알려주기"
              />
            </div>
            <div
              role="radiogroup"
              aria-label="일정 밀집 민감도"
              className="flex flex-wrap gap-2"
            >
              {DENSITY_OPTIONS.map((opt) => {
                const active = ui.densityThreshold === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={Boolean(ui.savingKey)}
                    onClick={() => changeDensity(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-white/[0.06] text-[var(--moneo-muted)] hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 border-t border-white/10 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">
                  긴급 메일 감지 시 알려주기
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--moneo-muted)]">
                  마감 임박 메일 등을 감지하면 알림을 보냅니다.
                </p>
              </div>
              <ToggleSwitch
                checked={ui.alertUrgentMessages}
                disabled={ui.savingKey === "alertUrgentMessages"}
                onChange={() => void toggleNotifyField("alertUrgentMessages")}
                label="긴급 메일 감지 시 알려주기"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--moneo-muted)]">알림 받을 시간대</span>
              <BoundedSelect
                id="active-hours-start"
                label="시작 시각"
                value={ui.activeHoursStart}
                options={HOURS}
                format={(h) => `${pad2(h)}:00`}
                disabled={Boolean(ui.savingKey)}
                onChange={(start) => changeActiveHours(start, ui.activeHoursEnd)}
              />
              <span className="text-xs text-white/50">~</span>
              <BoundedSelect
                id="active-hours-end"
                label="종료 시각"
                value={ui.activeHoursEnd}
                options={END_HOURS}
                format={(h) => `${pad2(h)}:00`}
                disabled={Boolean(ui.savingKey)}
                onChange={(end) => changeActiveHours(ui.activeHoursStart, end)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold text-white">알림 받을 채널</h3>
        <p className="mt-1 text-sm text-[var(--moneo-muted)]">
          브리핑·알림은 Gmail로 보냅니다.
        </p>
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">이메일 (Gmail)</p>
              <p className="mt-0.5 text-xs text-[var(--moneo-muted)]">
                {ui.gmailConnected ? "연결됨" : "연동 필요"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {ui.gmailConnected ? (
                <span className="rounded-full border border-indigo-500/50 bg-indigo-600/80 px-3 py-1.5 text-xs font-medium text-white">
                  사용 중
                </span>
              ) : (
                <button
                  type="button"
                  onClick={startGmailOAuth}
                  className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                >
                  Gmail 연동하기
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold text-white">최근 알림</h3>
        <p className="mt-1 text-sm text-[var(--moneo-muted)]">
          최근에 보낸 브리핑·상황 알림입니다.
        </p>
        {ui.recent.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--moneo-muted)]">
            아직 발송된 알림이 없어요
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10">
            {ui.recent.map((item) => {
              const Icon = alertIcon(item.alert_type);
              return (
                <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-300">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--moneo-muted)]">
                        {formatSentAt(item.sent_at)}
                      </span>
                      <span className="rounded-full bg-indigo-600/30 px-2 py-0.5 text-[11px] font-medium text-indigo-200">
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-white">{item.summary}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
