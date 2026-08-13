"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { mypageCardClass } from "@/components/mypage/mypage-sidebar-layout";
import { getApiBaseUrl } from "@/lib/api-base";
import { getChatUserId } from "@/lib/chat-user";
import {
  fetchIntegrations,
  integrationOAuthStartUrl,
  patchBriefingNotify,
  type IntegrationProvider,
} from "@/lib/integrations-api";
import {
  fetchNotificationSettings,
  patchNotificationSettings,
} from "@/lib/notification-settings-api";
import { mypageSectionUrl } from "@/lib/routes";

type NotifyChannel = "slack_dm" | "email";

const CHANNEL_STORAGE_KEY = "moneo.briefing_notify_channels";

type ToggleKey = "morningNotify" | "alertCalendarDensity" | "alertUrgentMessages";

function loadChannels(): NotifyChannel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHANNEL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is NotifyChannel => x === "slack_dm" || x === "email");
  } catch {
    return [];
  }
}

function saveChannels(channels: NotifyChannel[]) {
  localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(channels));
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
    savingKey: null as ToggleKey | null,
    savedFlash: false,
    morningNotify: false,
    alertCalendarDensity: false,
    alertUrgentMessages: false,
    slackConnected: false,
    gmailConnected: false,
    channels: [] as NotifyChannel[],
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
      const [notify, integrations] = await Promise.all([
        fetchNotificationSettings(userId, base),
        fetchIntegrations(userId, base),
      ]);
      const slack = integrations.integrations.find((i) => i.provider === "slack");
      const gmail = integrations.integrations.find((i) => i.provider === "gmail");
      patchUi({
        loading: false,
        morningNotify: integrations.briefing_notify,
        alertCalendarDensity: notify.alert_calendar_density,
        alertUrgentMessages: notify.alert_urgent_messages,
        slackConnected: Boolean(slack?.connected && slack.enabled),
        gmailConnected: Boolean(gmail?.connected && gmail.enabled),
        channels: loadChannels(),
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

  const toggleChannel = (channel: NotifyChannel) => {
    const connected =
      channel === "slack_dm" ? ui.slackConnected : ui.gmailConnected;
    if (!connected) return;
    const has = ui.channels.includes(channel);
    const next = has
      ? ui.channels.filter((c) => c !== channel)
      : [...ui.channels, channel];
    saveChannels(next);
    patchUi({ channels: next, savedFlash: true });
    window.setTimeout(() => patchUi({ savedFlash: false }), 1200);
  };

  const startOAuth = (provider: IntegrationProvider) => {
    const userId = getChatUserId();
    if (!userId) return;
    window.location.href = integrationOAuthStartUrl(
      provider,
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
            토글을 바꾸면 바로 저장됩니다. 연동된 채널로만 알림을 보낼 수 있어요.
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">매일 아침 브리핑 받기</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--moneo-muted)]">
                연동된 Slack DM 또는 이메일로 요약과 브리핑 링크를 보냅니다.
              </p>
            </div>
            <ToggleSwitch
              checked={ui.morningNotify}
              disabled={ui.savingKey === "morningNotify"}
              onChange={() => void toggleMorning()}
              label="매일 아침 브리핑 받기"
            />
          </div>

          <div className="flex items-start justify-between gap-4 border-t border-white/10 pt-5">
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

          <div className="flex items-start justify-between gap-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-sm font-medium text-white">
                긴급 메시지/메일 감지 시 알려주기
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--moneo-muted)]">
                Slack 긴급 멘션·마감 임박 메일을 감지하면 알림을 보냅니다.
              </p>
            </div>
            <ToggleSwitch
              checked={ui.alertUrgentMessages}
              disabled={ui.savingKey === "alertUrgentMessages"}
              onChange={() => void toggleNotifyField("alertUrgentMessages")}
              label="긴급 메시지/메일 감지 시 알려주기"
            />
          </div>
        </div>
      </section>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold text-white">알림 받을 채널</h3>
        <p className="mt-1 text-sm text-[var(--moneo-muted)]">
          연동된 채널만 선택할 수 있습니다.
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Slack DM</p>
              <p className="mt-0.5 text-xs text-[var(--moneo-muted)]">
                {ui.slackConnected ? "연결됨" : "연동 필요"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!ui.slackConnected ? (
                <button
                  type="button"
                  onClick={() => startOAuth("slack")}
                  className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                >
                  Slack 연동하기
                </button>
              ) : (
                <button
                  type="button"
                  aria-pressed={ui.channels.includes("slack_dm")}
                  onClick={() => toggleChannel("slack_dm")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    ui.channels.includes("slack_dm")
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-white/15 text-indigo-100/80 hover:border-indigo-400/40"
                  }`}
                >
                  {ui.channels.includes("slack_dm") ? "선택됨" : "선택"}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">이메일</p>
              <p className="mt-0.5 text-xs text-[var(--moneo-muted)]">
                {ui.gmailConnected ? "Gmail 연결됨" : "Gmail 연동 필요"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!ui.gmailConnected ? (
                <button
                  type="button"
                  onClick={() => startOAuth("gmail")}
                  className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                >
                  Gmail 연동하기
                </button>
              ) : (
                <button
                  type="button"
                  aria-pressed={ui.channels.includes("email")}
                  onClick={() => toggleChannel("email")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    ui.channels.includes("email")
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-white/15 text-indigo-100/80 hover:border-indigo-400/40"
                  }`}
                >
                  {ui.channels.includes("email") ? "선택됨" : "선택"}
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--moneo-muted)]">
          연동·권한은{" "}
          <Link
            href={mypageSectionUrl("account")}
            className="text-indigo-300 hover:text-indigo-200"
          >
            계정 관리
          </Link>
          에서도 확인할 수 있습니다.
        </p>
      </section>
    </div>
  );
}
