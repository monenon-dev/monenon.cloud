"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Calendar,
  FileSearch,
  Loader2,
  Mail,
  Plug,
  Save,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

import { WorkProfileTab } from "@/components/settings/work-profile-tab";
import { getApiBaseUrl } from "@/lib/api-base";
import {
  fetchIntegrations,
  integrationOAuthStartUrl,
  patchIntegration as patchIntegrationApi,
  type IntegrationProvider,
} from "@/lib/integrations-api";
import { getChatUserId } from "@/lib/chat-user";
import {
  BRIEFING_CHANNEL_OPTIONS,
  BRIEFING_FREQUENCY_OPTIONS,
  INTEGRATION_META,
  defaultAgentSettings,
  formatSyncAgo,
  isValidAgentSettingsTab,
  loadAgentSettings,
  saveAgentSettings,
  type AgentBriefingSettings,
  type AgentIntegrations,
  type AgentSettings,
  type AgentSettingsTab,
  type AgentWorkProfile,
  type BriefingChannel,
  type IntegrationId,
} from "@/lib/agent-settings-store";
import { routes } from "@/lib/routes";

const INTEGRATION_ICONS: Record<IntegrationId, LucideIcon> = {
  slack: Plug,
  gmail: Mail,
  calendar: Calendar,
  docs: FileSearch,
};

const OAUTH_INTEGRATIONS = new Set<IntegrationId>(["slack", "gmail"]);

const SETTINGS_TABS: {
  id: AgentSettingsTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "profile", label: "업무 프로필", icon: UserCircle },
  { id: "integrations", label: "연동 도구", icon: Plug },
  { id: "briefing", label: "브리핑 설정", icon: Bell },
];

const SECTION_SAVE_LABEL: Record<AgentSettingsTab, string> = {
  profile: "업무 프로필 저장",
  integrations: "연동 도구 저장",
  briefing: "브리핑 설정 저장",
};

type UiState = {
  loading: boolean;
  savingSection: AgentSettingsTab | null;
  error: string | null;
  savedSection: AgentSettingsTab | null;
  profilePickerOpen: boolean;
};

function tabButtonClass(active: boolean) {
  return active
    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
    : "border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/80 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40";
}

function SectionSaveBar({
  section,
  saving,
  saved,
  onSave,
}: {
  section: AgentSettingsTab;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="mt-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      {saved ? (
        <p className="text-sm text-green-700 dark:text-green-400">{SECTION_SAVE_LABEL[section]} 완료</p>
      ) : null}
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 sm:ml-auto"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {SECTION_SAVE_LABEL[section]}
      </button>
    </div>
  );
}

function AgentSettingsFormInner({
  showBackLink = true,
  constrainHeight = false,
}: {
  showBackLink?: boolean;
  constrainHeight?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeSection, setActiveSection] = useState<AgentSettingsTab>(
    isValidAgentSettingsTab(tabParam) ? tabParam : "profile"
  );
  const [settings, setSettings] = useState<AgentSettings>(defaultAgentSettings);
  const [ui, setUi] = useState<UiState>({
    loading: true,
    savingSection: null,
    error: null,
    savedSection: null,
    profilePickerOpen: false,
  });

  const patchUi = useCallback((patch: Partial<UiState>) => {
    setUi((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectSection = (id: AgentSettingsTab) => {
    setActiveSection(id);
    patchUi({ savedSection: null });
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`${routes.lifestyle.settings}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (isValidAgentSettingsTab(tabParam) && tabParam !== activeSection) {
      setActiveSection(tabParam);
    }
  }, [tabParam, activeSection]);

  const load = useCallback(async () => {
    const userId = getChatUserId();
    if (!userId) {
      patchUi({ loading: false, error: null });
      return;
    }
    patchUi({ loading: true, error: null, savedSection: null });
    try {
      await new Promise((r) => setTimeout(r, 200));
      const loaded = loadAgentSettings(userId);
      try {
        const remote = await fetchIntegrations(userId, getApiBaseUrl());
        for (const row of remote) {
          const id = row.provider as IntegrationId;
          if (id !== "slack" && id !== "gmail") continue;
          loaded.integrations[id] = {
            connected: row.connected && row.enabled,
            lastSyncedAt: row.connected_at,
          };
        }
      } catch {
        /* API 미배포 시 localStorage mock 유지 */
      }
      setSettings(loaded);
    } catch (e) {
      patchUi({ error: e instanceof Error ? e.message : "불러오기 실패" });
    } finally {
      patchUi({ loading: false });
    }
  }, [patchUi]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) patchUi({ error: decodeURIComponent(err) });
    if (searchParams.get("connected") === "1") {
      void load();
    }
  }, [searchParams, load, patchUi]);

  const patchProfile = (patch: Partial<AgentWorkProfile>) => {
    setSettings((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
    patchUi({ savedSection: null });
  };

  const patchIntegration = (id: IntegrationId, patch: Partial<AgentIntegrations[IntegrationId]>) => {
    setSettings((prev) => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [id]: { ...prev.integrations[id], ...patch },
      },
    }));
    patchUi({ savedSection: null });
  };

  const toggleIntegrationLocal = (id: IntegrationId) => {
    const connected = !settings.integrations[id].connected;
    patchIntegration(id, {
      connected,
      lastSyncedAt: connected ? new Date().toISOString() : null,
    });
  };

  const handleIntegrationAction = async (id: IntegrationId) => {
    const userId = getChatUserId();
    if (!userId) return;

    if (OAUTH_INTEGRATIONS.has(id)) {
      const conn = settings.integrations[id];
      if (conn.connected) {
        patchUi({ savingSection: "integrations", error: null });
        try {
          await patchIntegrationApi(userId, id as IntegrationProvider, false, getApiBaseUrl());
          patchIntegration(id, { connected: false, lastSyncedAt: null });
          saveAgentSettings(userId, {
            ...settings,
            integrations: {
              ...settings.integrations,
              [id]: { connected: false, lastSyncedAt: null },
            },
          });
        } catch (e) {
          patchUi({ error: e instanceof Error ? e.message : "연동 해제 실패" });
        } finally {
          patchUi({ savingSection: null });
        }
        return;
      }
      const next = `${routes.lifestyle.settings}?tab=integrations`;
      window.location.href = integrationOAuthStartUrl(
        id as IntegrationProvider,
        userId,
        next
      );
      return;
    }

    toggleIntegrationLocal(id);
  };

  const patchBriefing = (patch: Partial<AgentBriefingSettings>) => {
    setSettings((prev) => ({ ...prev, briefing: { ...prev.briefing, ...patch } }));
    patchUi({ savedSection: null });
  };

  const toggleBriefingChannel = (channel: BriefingChannel) => {
    setSettings((prev) => {
      const has = prev.briefing.channels.includes(channel);
      const channels = has
        ? prev.briefing.channels.filter((c) => c !== channel)
        : [...prev.briefing.channels, channel];
      return { ...prev, briefing: { ...prev.briefing, channels } };
    });
    patchUi({ savedSection: null });
  };

  const handleSaveSection = async (section: AgentSettingsTab) => {
    const userId = getChatUserId();
    if (!userId) return;
    patchUi({ savingSection: section, error: null, savedSection: null });
    try {
      if (section === "integrations") {
        for (const id of ["slack", "gmail"] as IntegrationProvider[]) {
          const conn = settings.integrations[id];
          if (conn.connected) {
            await patchIntegrationApi(userId, id, true, getApiBaseUrl());
          }
        }
      } else {
        await new Promise((r) => setTimeout(r, 450));
      }
      saveAgentSettings(userId, settings);
      patchUi({ savedSection: section });
    } catch (e) {
      patchUi({ error: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      patchUi({ savingSection: null });
    }
  };

  const userId = typeof window !== "undefined" ? getChatUserId() : null;

  if (!userId && !ui.loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/80 px-6 py-8 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm text-gray-800 dark:text-gray-200">
          에이전트 설정을 저장하려면 로그인이 필요합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={routes.oauth.login}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            로그인
          </Link>
          {showBackLink ? (
            <Link href="/" className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">
              홈으로
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto max-w-3xl space-y-4 ${
        constrainHeight ? "flex min-h-0 flex-1 flex-col pb-2" : "space-y-6 pb-8"
      }`}
    >
      {showBackLink ? (
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft size={18} />
          홈
        </Link>
      ) : null}

      <header className={constrainHeight ? "shrink-0" : undefined}>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">에이전트 설정</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          업무 프로필·연동 도구·브리핑 방식을 설정합니다.
        </p>

        {!ui.loading ? (
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="에이전트 설정 카테고리">
            {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeSection === id}
                onClick={() => selectSection(id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${tabButtonClass(activeSection === id)}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {!ui.loading ? (
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 text-xs text-gray-500 underline hover:text-gray-800 dark:hover:text-gray-300"
          >
            서버에서 다시 불러오기
          </button>
        ) : null}
      </header>

      {ui.error ? (
        <p
          role="alert"
          className={`rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 ${
            constrainHeight ? "shrink-0" : ""
          }`}
        >
          {ui.error}
        </p>
      ) : null}

      {ui.loading ? (
        <div className={`flex justify-center py-16 ${constrainHeight ? "min-h-0 flex-1" : ""}`}>
          <Loader2 className="size-8 animate-spin text-indigo-600" aria-label="불러오는 중" />
        </div>
      ) : (
        <div
          role="tabpanel"
          aria-label={SETTINGS_TABS.find((t) => t.id === activeSection)?.label}
          className={constrainHeight ? "flex min-h-0 flex-1 flex-col overflow-y-auto" : undefined}
        >
          {activeSection === "profile" ? (
            <WorkProfileTab
              profile={settings.profile}
              profilePickerOpen={ui.profilePickerOpen}
              onProfilePickerOpenChange={(open) => patchUi({ profilePickerOpen: open })}
              onPatchProfile={patchProfile}
              saveBar={
                <SectionSaveBar
                  section="profile"
                  saving={ui.savingSection === "profile"}
                  saved={ui.savedSection === "profile"}
                  onSave={() => void handleSaveSection("profile")}
                />
              }
            />
          ) : null}

          {activeSection === "integrations" ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Plug size={22} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">연동 도구</h2>
              </div>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                브리핑과 리포트 생성 시 참고할 도구를 연결하세요.
              </p>

              <ul className="space-y-3">
                {INTEGRATION_META.map(({ id, tool, name }) => {
                  const Icon = INTEGRATION_ICONS[id];
                  const conn = settings.integrations[id];
                  const syncLabel = formatSyncAgo(conn.lastSyncedAt);
                  return (
                    <li
                      key={id}
                      className={`rounded-xl border border-gray-200 p-4 dark:border-gray-700 ${
                        conn.connected ? "bg-white dark:bg-gray-900/60" : "opacity-70"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                            <Icon size={20} aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {name}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  conn.connected
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                              >
                                {conn.connected ? "연결됨" : "연결 안 됨"}
                              </span>
                            </div>
                            <p className="mt-0.5 font-mono text-xs text-gray-500">{tool}</p>
                            {conn.connected && syncLabel ? (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{syncLabel}</p>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleIntegrationAction(id)}
                          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                            conn.connected
                              ? "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                              : "bg-indigo-600 text-white hover:bg-indigo-700"
                          }`}
                        >
                          {conn.connected ? "연결 해제" : "연결하기"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <SectionSaveBar
                section="integrations"
                saving={ui.savingSection === "integrations"}
                saved={ui.savedSection === "integrations"}
                onSave={() => void handleSaveSection("integrations")}
              />
            </section>
          ) : null}

          {activeSection === "briefing" ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Bell size={22} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">브리핑 설정</h2>
              </div>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                정기 브리핑을 받을 시간과 방식을 설정하세요.
              </p>

              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">브리핑 주기</p>
                  <div className="flex flex-wrap gap-2">
                    {BRIEFING_FREQUENCY_OPTIONS.map((opt) => {
                      const selected = settings.briefing.frequency === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => patchBriefing({ frequency: opt.value })}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="briefing-time" className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    브리핑 시간
                  </label>
                  <input
                    id="briefing-time"
                    type="time"
                    value={settings.briefing.time}
                    onChange={(e) => patchBriefing({ time: e.target.value })}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">알림 채널</p>
                  <div className="flex flex-wrap gap-2">
                    {BRIEFING_CHANNEL_OPTIONS.map((opt) => {
                      const selected = settings.briefing.channels.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleBriefingChannel(opt.value)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <SectionSaveBar
                section="briefing"
                saving={ui.savingSection === "briefing"}
                saved={ui.savedSection === "briefing"}
                onSave={() => void handleSaveSection("briefing")}
              />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function AgentSettingsFallback() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-8 animate-spin text-indigo-600" aria-label="로딩 중" />
    </div>
  );
}

export function AgentSettingsForm(props: {
  showBackLink?: boolean;
  constrainHeight?: boolean;
}) {
  return (
    <Suspense fallback={<AgentSettingsFallback />}>
      <AgentSettingsFormInner {...props} />
    </Suspense>
  );
}
