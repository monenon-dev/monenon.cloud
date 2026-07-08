"""채팅 메시지 금칙어 검사."""

from __future__ import annotations

PROFANITY_WORDS: tuple[str, ...] = (
    "씨발",
    "시발",
    "병신",
    "개새끼",
    "좆",
    "지랄",
    "미친",
    "fuck",
    "shit",
    "bitch",
)


def contains_profanity(text: str) -> bool:
    lowered = text.lower().replace(" ", "")
    return any(word in lowered for word in PROFANITY_WORDS)
