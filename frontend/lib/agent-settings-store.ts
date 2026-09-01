import { getChatUserId } from "@/lib/chat-user";
import {
  INDUSTRY_OPTIONS,
  loadMyPagePreferences,
  type UserType,
} from "@/lib/mypage-preferences";

export type AgentSettingsTab = "profile" | "integrations" | "briefing";

export type WorkTone = "formal" | "casual" | "concise";

export type BriefingFrequency = "daily" | "weekdays" | "weekly";

export type BriefingChannel = "email" | "in_app";

export type IntegrationId = "slack" | "gmail" | "calendar" | "docs";

export type IntegrationConnection = {
  connected: boolean;
  lastSyncedAt: string | null;
};

export type AgentWorkProfile = {
  userType: UserType | null;
  workTone: WorkTone;
  /** 단일 선택 업종 라벨 */
  industry: string | null;
  /** 사용자가 추가한 업종 옵션 */
  customIndustries: string[];
};

export type AgentIntegrations = Record<IntegrationId, IntegrationConnection>;

export type BriefingValidatorMode = "auto" | "review";

export type AgentBriefingSettings = {
  frequency: BriefingFrequency;
  time: string;
  channels: BriefingChannel[];
  /** 매일 아침 Gmail로 브리핑 요약 수신 */
  morningNotify: boolean;
  /** 일정 밀집·겹침 감지 시 능동 알림 */
  alertCalendarDensity: boolean;
  /** 긴급 메일 감지 시 능동 알림 */
  alertUrgentMessages: boolean;
  /** 검증 실패 시 auto=자동 재시도, review=사용자 검토 */
  validatorMode: BriefingValidatorMode;
};

export type AgentSettings = {
  profile: AgentWorkProfile;
  integrations: AgentIntegrations;
  briefing: AgentBriefingSettings;
};

export const PREDEFINED_INDUSTRIES = [
  "IT·개발",
  "마케팅",
  "디자인",
  "기획·전략",
  "영업",
  "인사·HR",
  "금융",
  "교육",
  "의료",
  "제조·생산",
  "프리랜서·기타",
] as const;

export function mergeIndustryOptions(customIndustries: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const label of [...PREDEFINED_INDUSTRIES, ...customIndustries]) {
    const trimmed = label.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    merged.push(trimmed);
  }
  return merged;
}

export function normalizeCustomIndustries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

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
];

export const INTEGRATION_META: {
  id: IntegrationId;
  tool: string;
  name: string;
}[] = [
  { id: "gmail", tool: "gmail.digest", name: "Gmail" },
  { id: "calendar", tool: "calendar.list", name: "Calendar" },
  { id: "docs", tool: "docs.search", name: "문서 저장소" },
];

const STORAGE_PREFIX = "moneo-agent-settings:";

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
      industry: null,
      customIndustries: [],
    },
    integrations: {
      slack: { connected: false, lastSyncedAt: null },
      gmail: { connected: false, lastSyncedAt: null },
      calendar: { connected: false, lastSyncedAt: null },
      docs: { connected: false, lastSyncedAt: null },
    },
    briefing: {
      frequency: "weekdays",
      time: "09:00",
      channels: ["in_app"],
      morningNotify: false,
      alertCalendarDensity: false,
      alertUrgentMessages: false,
      validatorMode: "auto",
    },
  };
}

function mergeSettings(raw: Partial<AgentSettings> | null): AgentSettings {
  const base = defaultAgentSettings();
  if (!raw) return base;
  return {
    profile: {
      ...base.profile,
      ...raw.profile,
      customIndustries: normalizeCustomIndustries(
        raw.profile?.customIndustries ?? base.profile.customIndustries
      ),
    },
    integrations: {
      slack: { ...base.integrations.slack, ...raw.integrations?.slack },
      gmail: { ...base.integrations.gmail, ...raw.integrations?.gmail },
      calendar: { ...base.integrations.calendar, ...raw.integrations?.calendar },
      docs: { ...base.integrations.docs, ...raw.integrations?.docs },
    },
    briefing: {
      ...base.briefing,
      ...raw.briefing,
      channels: (raw.briefing?.channels ?? base.briefing.channels).filter(
        (c): c is BriefingChannel => c === "email" || c === "in_app"
      ),
      morningNotify: raw.briefing?.morningNotify ?? base.briefing.morningNotify,
      alertCalendarDensity:
        raw.briefing?.alertCalendarDensity ?? base.briefing.alertCalendarDensity,
      alertUrgentMessages:
        raw.briefing?.alertUrgentMessages ?? base.briefing.alertUrgentMessages,
      validatorMode:
        raw.briefing?.validatorMode === "review" ? "review" : base.briefing.validatorMode,
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
    const onboardingPrefs = loadMyPagePreferences(userId);
    if (onboardingPrefs.userType && !merged.profile.userType) {
      merged.profile.userType = onboardingPrefs.userType;
    }
    if (!merged.profile.industry && onboardingPrefs.industry) {
      const label = INDUSTRY_OPTIONS.find((o) => o.value === onboardingPrefs.industry)?.label;
      if (label) merged.profile.industry = label;
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
