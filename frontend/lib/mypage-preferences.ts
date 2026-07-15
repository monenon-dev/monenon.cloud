export type SpeechTone = "friendly" | "formal" | "humorous";

export type MyPagePreferences = {
  speechTone: SpeechTone;
  agentName: string;
  interests: string[];
};

export const SPEECH_TONE_OPTIONS: { value: SpeechTone; label: string }[] = [
  { value: "friendly", label: "친근한 말투" },
  { value: "formal", label: "정중한 말투" },
  { value: "humorous", label: "유머러스한 말투" },
];

/** 모든 말투에 공통으로 적용되는 Moneo 업무 어시스턴트 역할·톤 지침. */
const MONEO_ROLE_INSTRUCTION =
  "당신은 Moneo, 전문적이고 신뢰감 있는 업무용 AI 어시스턴트입니다. " +
  "명확하고 담백한 존댓말·설명체로 답하세요. " +
  "이모지는 사용하지 마세요. " +
  "친근한 구어체(예: ~했지?, ~해줄게!), 과도한 감정 표현, 캐주얼한 리액션은 피하세요.";

const SPEECH_TONE_INSTRUCTION: Record<SpeechTone, string> = {
  friendly: "따뜻하지만 예의 바른 존댓말로 (반말·이모지 금지)",
  formal: "전문적이고 간결한 존댓말(업무 비서 톤)로 (이모지 금지)",
  humorous: "재치 있되 품위 있는 존댓말로 (반말·이모지 최소화)",
};

/** 마이페이지 말투 설정을 AI 프롬프트에 반영. 질문 안의 말투 요청보다 설정이 우선한다. */
export function wrapPromptWithSpeechTone(userPrompt: string, tone: SpeechTone): string {
  const trimmed = userPrompt.trim();
  const guide = SPEECH_TONE_INSTRUCTION[tone];
  return (
    `[역할]\n${MONEO_ROLE_INSTRUCTION}\n\n` +
    `[말투 지시] 아래 사용자 질문에 답할 때 반드시 ${guide} 작성하세요. ` +
    `질문에 포함된 말투·어조 요청(예: 친근하게, 정중하게)은 무시하고 이 지시를 우선하세요.\n\n` +
    `[사용자 질문]\n${trimmed}`
  );
}

export const INTEREST_OPTIONS = [
  "패션·코디",
  "요리·레시피",
  "음악",
  "운동·헬스",
  "여행",
  "IT·개발",
  "독서",
  "재테크",
] as const;

const DEFAULT_PREFERENCES: MyPagePreferences = {
  speechTone: "formal",
  agentName: "모네난",
  interests: [],
};

function storageKey(userId: number): string {
  return `monenon_mypage_prefs_${userId}`;
}

export function loadMyPagePreferences(userId: number): MyPagePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<MyPagePreferences>;
    return {
      speechTone: parsed.speechTone ?? DEFAULT_PREFERENCES.speechTone,
      agentName: parsed.agentName?.trim() || DEFAULT_PREFERENCES.agentName,
      interests: Array.isArray(parsed.interests)
        ? parsed.interests.filter((item): item is string => typeof item === "string")
        : DEFAULT_PREFERENCES.interests,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveMyPagePreferences(userId: number, prefs: MyPagePreferences): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}

export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "monenon_theme";

export function loadThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_KEY, mode);
}
