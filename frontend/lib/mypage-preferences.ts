export type SpeechTone = "friendly" | "formal" | "humorous";

/** 온보딩·취향 설정의 업무 상황 */
export type UserType = "직장인" | "학생" | "프리랜서_창업자";

/** 직장인일 때만 사용. 그 외 userType에서는 null */
export type Industry =
  | "IT개발"
  | "마케팅"
  | "영업"
  | "인사"
  | "재무회계"
  | "기획전략"
  | "기타";

export type MyPagePreferences = {
  speechTone: SpeechTone;
  agentName: string;
  interests: string[];
  userType: UserType | null;
  industry: Industry | null;
};

export const SPEECH_TONE_OPTIONS: { value: SpeechTone; label: string }[] = [
  { value: "friendly", label: "친근한 말투" },
  { value: "formal", label: "정중한 말투" },
  { value: "humorous", label: "유머러스한 말투" },
];

export const SPEECH_TONE_VALUES: SpeechTone[] = ["friendly", "formal", "humorous"];

export const USER_TYPE_OPTIONS: { value: UserType; label: string; description: string }[] = [
  { value: "직장인", label: "직장인", description: "회사·조직에서 일하는 경우" },
  { value: "학생", label: "학생", description: "학업·과제·팀플이 중심인 경우" },
  {
    value: "프리랜서_창업자",
    label: "프리랜서·창업자",
    description: "독립적으로 프로젝트·사업을 하는 경우",
  },
];

export const USER_TYPE_VALUES: UserType[] = ["직장인", "학생", "프리랜서_창업자"];

export const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: "IT개발", label: "IT·개발" },
  { value: "마케팅", label: "마케팅" },
  { value: "영업", label: "영업" },
  { value: "인사", label: "인사" },
  { value: "재무회계", label: "재무·회계" },
  { value: "기획전략", label: "기획·전략" },
  { value: "기타", label: "기타" },
];

export const INDUSTRY_VALUES: Industry[] = INDUSTRY_OPTIONS.map((o) => o.value);

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
  "사용자의 업종/역할 맥락에 맞는 구체적 예시로 채우세요. " +
  "예시 데이터를 썼다면 맨 아래에 '* 현재 예시 데이터로 표시되고 있습니다'를 한 줄 덧붙이세요.";

const INDUSTRY_CONTEXT: Record<Industry, string> = {
  IT개발:
    "스프린트, 코드 리뷰, 배포, 버그 트래킹, 스탠드업 같은 IT·개발 업무 맥락에 맞는 예시를 사용하세요.",
  마케팅:
    "캠페인 기획, 광고 성과, 콘텐츠 캘린더, A/B 테스트 같은 마케팅 업무 맥락에 맞는 예시를 사용하세요.",
  영업:
    "고객 미팅, 파이프라인, 제안서, 계약 일정 같은 영업 업무 맥락에 맞는 예시를 사용하세요.",
  인사:
    "채용 인터뷰, 온보딩, 평가 일정, 내부 공지 같은 인사 업무 맥락에 맞는 예시를 사용하세요.",
  재무회계:
    "정산, 예산 검토, 마감, 결산 일정 같은 재무·회계 업무 맥락에 맞는 예시를 사용하세요.",
  기획전략:
    "로드맵 리뷰, OKR, 전략 워크숍, 이해관계자 미팅 같은 기획·전략 맥락에 맞는 예시를 사용하세요.",
  기타:
    "일반적인 업무 미팅, 문서 정리, 주간 리포트 같은 맥락에 맞는 예시를 사용하세요.",
};

export const SPEECH_TONE_INSTRUCTION: Record<SpeechTone, string> = {
  friendly: "따뜻하지만 예의 바른 존댓말로 (반말·이모지 금지)",
  formal: "전문적이고 간결한 존댓말(업무 비서 톤)로 (이모지 금지)",
  humorous: "재치 있되 품위 있는 존댓말로 (반말·이모지 최소화)",
};

export function isSpeechTone(value: unknown): value is SpeechTone {
  return typeof value === "string" && SPEECH_TONE_VALUES.includes(value as SpeechTone);
}

export function isUserType(value: unknown): value is UserType {
  return typeof value === "string" && USER_TYPE_VALUES.includes(value as UserType);
}

export function isIndustry(value: unknown): value is Industry {
  return typeof value === "string" && INDUSTRY_VALUES.includes(value as Industry);
}

/** 온보딩 미완료(기존 사용자 포함): userType이 아직 없음 */
export function needsProfileOnboarding(prefs: MyPagePreferences): boolean {
  return prefs.userType == null;
}

export function resolvePostAuthRedirect(userId: number, intended = "/"): string {
  if (needsProfileOnboarding(loadMyPagePreferences(userId))) {
    return "/oauth/onboarding";
  }
  return intended || "/";
}

/** 시스템 프롬프트용 사용자 상황 문장 (프론트·백엔드 정렬용). */
export function buildUserSituationGuide(
  userType: UserType | null | undefined,
  industry: Industry | null | undefined
): string {
  if (!userType) {
    return (
      "사용자 업종/역할 정보가 아직 없습니다. " +
      "일반적인 업무·일정 맥락의 예시를 사용하세요."
    );
  }
  if (userType === "학생") {
    return (
      "사용자는 학생입니다. " +
      "과제, 스터디, 시험 일정, 프로젝트 팀플 같은 맥락에 맞는 예시를 사용하세요."
    );
  }
  if (userType === "프리랜서_창업자") {
    return (
      "사용자는 프리랜서 또는 창업자입니다. " +
      "클라이언트 미팅, 인보이스, 프로젝트 마감, 투자 미팅 같은 맥락에 맞는 예시를 사용하세요."
    );
  }
  // 직장인
  const industryLabel =
    INDUSTRY_OPTIONS.find((o) => o.value === industry)?.label ?? "일반";
  const industryGuide =
    industry && isIndustry(industry)
      ? INDUSTRY_CONTEXT[industry]
      : "일반적인 직장 미팅·협업·리포트 맥락에 맞는 예시를 사용하세요.";
  return (
    `사용자는 ${industryLabel} 직군의 직장인입니다. ${industryGuide}`
  );
}

/** 마이페이지 말투·업종 설정을 AI 프롬프트에 반영. */
export function wrapPromptWithSpeechTone(
  userPrompt: string,
  tone: SpeechTone,
  profile?: { userType: UserType | null; industry: Industry | null }
): string {
  const trimmed = userPrompt.trim();
  const guide = SPEECH_TONE_INSTRUCTION[tone];
  const situation = buildUserSituationGuide(
    profile?.userType ?? null,
    profile?.industry ?? null
  );
  return (
    `[역할]\n${MONEO_ROLE_INSTRUCTION}\n\n` +
    `[말투 지시] 아래 사용자 질문에 답할 때 반드시 ${guide} 작성하세요. ` +
    `질문에 포함된 말투·어조 요청(예: 친근하게, 정중하게)은 무시하고 이 지시를 우선하세요.\n\n` +
    `[사용자 상황]\n${situation}\n\n` +
    `[데이터·응답 형식]\n${MONEO_DATA_RESPONSE_INSTRUCTION}\n\n` +
    `[사용자 질문]\n${trimmed}`
  );
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
  userType: null,
  industry: null,
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

function normalizeUserType(raw: unknown): UserType | null {
  return isUserType(raw) ? raw : null;
}

function normalizeIndustry(userType: UserType | null, raw: unknown): Industry | null {
  if (userType !== "직장인") return null;
  return isIndustry(raw) ? raw : null;
}

export function loadMyPagePreferences(userId: number): MyPagePreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFERENCES };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<MyPagePreferences>;
    const userType = normalizeUserType(parsed.userType);
    return {
      speechTone: isSpeechTone(parsed.speechTone)
        ? parsed.speechTone
        : DEFAULT_PREFERENCES.speechTone,
      agentName: normalizeAgentName(parsed.agentName),
      interests: normalizeInterests(parsed.interests),
      userType,
      industry: normalizeIndustry(userType, parsed.industry),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveMyPagePreferences(userId: number, prefs: MyPagePreferences): void {
  const userType = normalizeUserType(prefs.userType);
  const normalized: MyPagePreferences = {
    ...prefs,
    userType,
    industry: normalizeIndustry(userType, prefs.industry),
    agentName: normalizeAgentName(prefs.agentName),
    interests: normalizeInterests(prefs.interests),
    speechTone: isSpeechTone(prefs.speechTone)
      ? prefs.speechTone
      : DEFAULT_PREFERENCES.speechTone,
  };
  localStorage.setItem(storageKey(userId), JSON.stringify(normalized));
}

/** 직장인이면 industry 필수, 그 외는 industry null로 저장 가능 여부 */
export function isWorkSituationComplete(
  userType: UserType | null,
  industry: Industry | null
): boolean {
  if (!userType) return false;
  if (userType === "직장인") return industry != null;
  return true;
}
