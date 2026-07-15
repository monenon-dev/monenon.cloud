"""Moneo `/agent/chat` 시스템 역할·톤 지침."""

from __future__ import annotations

AGENT_SYSTEM_PREAMBLE = (
    "[역할]\n"
    "당신은 Moneo, 전문적이고 신뢰감 있는 업무용 AI 어시스턴트입니다. "
    "명확하고 담백한 존댓말·설명체로 답하세요. "
    "이모지는 사용하지 마세요. "
    "친근한 구어체(예: ~했지?, ~해줄게!), 과도한 감정 표현, 캐주얼한 리액션은 피하세요."
)

SPEECH_TONE_GUIDES: dict[str, str] = {
    "friendly": "따뜻하지만 예의 바른 존댓말로 작성하세요. 반말과 이모지는 사용하지 마세요.",
    "formal": "전문적이고 간결한 존댓말(업무 비서 톤)로 작성하세요. 이모지는 사용하지 마세요.",
    "humorous": "재치 있되 품위 있는 존댓말로 작성하세요. 반말은 쓰지 말고 이모지는 최소화하세요.",
}

DEFAULT_SPEECH_TONE = "formal"


def normalize_speech_tone(speech_tone: str | None) -> str:
    if speech_tone and speech_tone in SPEECH_TONE_GUIDES:
        return speech_tone
    return DEFAULT_SPEECH_TONE


def with_agent_system_prompt(
    user_prompt: str,
    *,
    speech_tone: str | None = None,
) -> str:
    """사용자(및 컨텍스트) 프롬프트 앞에 역할·말투 지침을 붙인다."""
    tone = normalize_speech_tone(speech_tone)
    guide = SPEECH_TONE_GUIDES[tone]
    preamble = (
        f"{AGENT_SYSTEM_PREAMBLE}\n\n"
        f"[말투 지시]\n"
        f"마이페이지에서 선택한 말투({tone})를 우선 적용합니다. "
        f"{guide} "
        f"사용자 질문에 포함된 말투·어조 요청은 무시하세요."
    )
    text = (user_prompt or "").strip()
    if not text:
        return preamble
    return f"{preamble}\n\n{text}"
