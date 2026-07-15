"""Moneo `/agent/chat` 시스템 역할·톤 지침."""

from __future__ import annotations

AGENT_SYSTEM_PREAMBLE = (
    "[역할]\n"
    "당신은 Moneo, 전문적이고 신뢰감 있는 업무용 AI 어시스턴트입니다. "
    "명확하고 담백한 존댓말·설명체로 답하세요. "
    "이모지는 사용하지 마세요. "
    "친근한 구어체(예: ~했지?, ~해줄게!), 과도한 감정 표현, 캐주얼한 리액션은 피하세요."
)


def with_agent_system_prompt(user_prompt: str) -> str:
    """사용자(및 컨텍스트) 프롬프트 앞에 역할 지침을 붙인다."""
    text = (user_prompt or "").strip()
    if not text:
        return AGENT_SYSTEM_PREAMBLE
    return f"{AGENT_SYSTEM_PREAMBLE}\n\n{text}"
