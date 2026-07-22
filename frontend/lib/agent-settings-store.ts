import { getChatUserId } from "@/lib/chat-user";
import { loadMyPagePreferences, type UserType } from "@/lib/mypage-preferences";

export type AgentSettingsTab = "profile" | "integrations" | "briefing";

export type WorkTone = "formal" | "casual" | "concise";

export type BriefingFrequency = "daily" | "weekdays" | "weekly";

export type BriefingChannel = "email" | "in_app" | "slack_dm";

export type IntegrationId = "slack" | "calendar" | "docs";

export type IntegrationConnection = {
  connected: boolean;
  lastSyncedAt: string | null;
};

export type AgentWorkProfile = {
  userType: UserType | null;
  workTone: WorkTone;
};

export type AgentIntegrations = Record<IntegrationId, IntegrationConnection>;

export type AgentBriefingSettings = {
  frequency: BriefingFrequency;
  time: string;
  channels: BriefingChannel[];
};

export type AgentSettings = {
  profile: AgentWorkProfile;
  integrations: AgentIntegrations;
  briefing: AgentBriefingSettings;
};

const STORAGE_PREFIX = "monenon_agent_settings_";

export const WORK_TONE_OPTIONS: { value: WorkTone; label: string }[] = [
  { value: "formal", label: "공식적으로" },
  { value: "casual", label: "편하게" },
  { value: "concise", label: "간결하게" },
];

export const BRIEFING_FREQUENCY_OPTIONS: { value: BriefingFrequency; label: string }[] = [
  { value: "daily", label: "매일" },
  { value: "weekdays", label: "평일만" },
  { value: "weekly", label: "주 1회" },
];

export const BRIEFING_CHANNEL_OPTIONS: { value: BriefingChannel; label: string }[] = [
  { value: "email", label: "이메일" },
  { value: "in_app", label: "앱 내 알림" },
  { value: "slack_dm", label: "Slack DM" },
];

export const INTEGRATION_META: {
  id: IntegrationId;
  tool: string;
  name: string;
}[] = [
  { id: "slack", tool: "slack.digest", name: "Slack" },
  { id: "calendar", tool: "calendar.list", name: "Calendar" },
  { id: "docs", tool: "docs.search", name: "문서 저장소" },
];

function storageKey(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function defaultAgentSettings(): AgentSettings {
  return {
    profile: {
      userType: null,
      workTone: "formal",
    },
    integrations: {
      slack: { connected: true, lastSyncedAt: minutesAgoIso(5) },
      calendar: { connected: true, lastSyncedAt: minutesAgoIso(12) },
      docs: { connected: false, lastSyncedAt: null },
    },
    briefing: {
      frequency: "weekdays",
      time: "09:00",
      channels: ["in_app"],
    },
  };
}

function mergeSettings(raw: Partial<AgentSettings> | null): AgentSettings {
  const base = defaultAgentSettings();
  if (!raw) return base;
  return {
    profile: { ...base.profile, ...raw.profile },
    integrations: {
      slack: { ...base.integrations.slack, ...raw.integrations?.slack },
      calendar: { ...base.integrations.calendar, ...raw.integrations?.calendar },
      docs: { ...base.integrations.docs, ...raw.integrations?.docs },
    },
    briefing: {
      ...base.briefing,
      ...raw.briefing,
      channels: raw.briefing?.channels ?? base.briefing.channels,
    },
  };
}

/** mock — TODO: GET /api/agent/settings */
export function loadAgentSettings(userId: number): AgentSettings {
  if (typeof window === "undefined") return defaultAgentSettings();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as Partial<AgentSettings>) : null;
    const merged = mergeSettings(parsed);
    const onboardingType = loadMyPagePreferences(userId).userType;
    if (onboardingType && !merged.profile.userType) {
      merged.profile.userType = onboardingType;
    }
    return merged;
  } catch {
    return defaultAgentSettings();
  }
}

/** mock — TODO: PATCH /api/agent/settings */
export function saveAgentSettings(userId: number, settings: AgentSettings): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(settings));
}

export function formatSyncAgo(iso: string | null): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return "방금 동기화됨";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}분 전 동기화됨`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전 동기화됨`;
  const days = Math.floor(hours / 24);
  return `${days}일 전 동기화됨`;
}

export function resolveAgentSettingsUserId(): number | null {
  return getChatUserId();
}

export function isValidAgentSettingsTab(value: string | null): value is AgentSettingsTab {
  return value === "profile" || value === "integrations" || value === "briefing";
}
