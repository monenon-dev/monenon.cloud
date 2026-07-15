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

export const SPEECH_TONE_VALUES: SpeechTone[] = ["friendly", "formal", "humorous"];

/** 모든 말투에 공통으로 적용되는 Moneo 업무 어시스턴트 역할·톤 지침. */
const MONEO_ROLE_INSTRUCTION =
  "당신은 Moneo, 전문적이고 신뢰감 있는 업무용 AI 어시스턴트입니다. " +
  "명확하고 담백한 존댓말·설명체로 답하세요. " +
  "이모지는 사용하지 마세요. " +
  "친근한 구어체(예: ~했지?, ~해줄게!), 과도한 감정 표현, 캐주얼한 리액션은 피하세요.";

/** 연동 데이터 부재 시 플레이스홀더 노출을 막고, 구체적 예시로 응답하도록 하는 지침. */
const MONEO_DATA_RESPONSE_INSTRUCTION =
  "실제 사용자 데이터(캘린더, 문서, 메시지 등)에 접근할 수 없어도 " +
  "대괄호·플레이스홀더([회의명], [참석자] 등)를 응답에 그대로 쓰지 마세요. " +
  "실제 업무처럼 구체적 예시로 채우세요 " +
  "(예: 오전 10시 팀 스탠드업 (참석자: 김민수, 이지은, 박준혁)). " +
  "예시 데이터를 썼다면 맨 아래에 '* 현재 예시 데이터로 표시되고 있습니다'를 한 줄 덧붙이세요.";

export const SPEECH_TONE_INSTRUCTION: Record<SpeechTone, string> = {
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
    `[데이터·응답 형식]\n${MONEO_DATA_RESPONSE_INSTRUCTION}\n\n` +
    `[사용자 질문]\n${trimmed}`
  );
}

export function isSpeechTone(value: unknown): value is SpeechTone {
  return typeof value === "string" && SPEECH_TONE_VALUES.includes(value as SpeechTone);
}

export const INTEREST_OPTIONS = [
  "문서 관리",
  "일정 관리",
  "리포트 작성",
  "커뮤니케이션(메일/슬랙)",
  "데이터 분석",
  "프로젝트 관리",
  "리서치",
  "IT·개발",
] as const;

const INTEREST_SET = new Set<string>(INTEREST_OPTIONS);

const DEFAULT_PREFERENCES: MyPagePreferences = {
  speechTone: "formal",
  agentName: "Moneo",
  interests: [],
};

function storageKey(userId: number): string {
  return `monenon_mypage_prefs_${userId}`;
}

function normalizeAgentName(name: string | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed || trimmed === "모네난") return DEFAULT_PREFERENCES.agentName;
  return trimmed;
}

function normalizeInterests(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_PREFERENCES.interests;
  return raw.filter((item): item is string => typeof item === "string" && INTEREST_SET.has(item));
}

export function loadMyPagePreferences(userId: number): MyPagePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<MyPagePreferences>;
    return {
      speechTone: isSpeechTone(parsed.speechTone)
        ? parsed.speechTone
        : DEFAULT_PREFERENCES.speechTone,
      agentName: normalizeAgentName(parsed.agentName),
      interests: normalizeInterests(parsed.interests),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveMyPagePreferences(userId: number, prefs: MyPagePreferences): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}
