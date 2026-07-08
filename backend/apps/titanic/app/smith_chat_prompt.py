from __future__ import annotations

import re

from titanic.adapter.inbound.api.schemas.crew_smith_captain_schema import SmithChatTurnSchema

TITANIC_KEYWORDS: tuple[str, ...] = (
    "타이타닉",
    "titanic",
    "rms",
    "승객",
    "침몰",
    "생존",
    "사망",
    "사상",
    "빙산",
    "iceberg",
    "선장",
    "smith",
    "스미스",
    "등석",
    "pclass",
    "요금",
    "fare",
    "객실",
    "cabin",
    "탑승",
    "embarked",
    "로즈",
    "rose",
    "잭",
    "jack",
    "구명",
    "보트",
    "1912",
    "southampton",
    "cherbourg",
    "queenstown",
    "화이트스타",
    "whitestar",
    "대서양",
    "passenger",
    "survived",
    "survival",
    "생존자",
    "사망자",
    "사상자",
    "명단",
    "티켓",
    "ticket",
    "앤드류스",
    "andrews",
    "하틀리",
    "hartley",
    "몇명",
    "몇 명",
    "몇명이",
    "그럼",
    "그렇다면",
)

OFF_TOPIC_REPLY = "타이타닉 승객, 항해, 침몰, 생존과 관련된 질문만 답할 수 있습니다."


def is_titanic_related(message: str, history: list[SmithChatTurnSchema]) -> bool:
    text = message.lower()
    if any(keyword in text for keyword in TITANIC_KEYWORDS):
        return True
    return bool(history)


def try_stats_answer(message: str, stats: dict[str, int]) -> str | None:
    text = message.lower().replace(" ", "")
    total = stats.get("total", 0)
    survived = stats.get("survived", 0)
    perished = stats.get("perished", 0)

    if re.search(r"(생존|살아남|surviv)", text):
        return f"현재 기록상 생존자는 {survived:,}명입니다."
    if re.search(r"(사망|사상|숨진|perish|casualt|희생)", text):
        return f"현재 기록상 사망자는 {perished:,}명입니다."
    if re.search(r"(전체|총|승객.?수|몇명|몇명이|passenger)", text) and not re.search(
        r"(생존|사망|사상)", text
    ):
        return f"현재 기록상 승객은 총 {total:,}명이며, 생존 {survived:,}명·사망 {perished:,}명입니다."
    return None


def build_smith_prompt(
    message: str,
    history: list[SmithChatTurnSchema],
    stats: dict[str, int],
) -> str:
    total = stats.get("total", 0)
    survived = stats.get("survived", 0)
    perished = stats.get("perished", 0)

    lines = [
        "당신은 RMS 타이타닉 선장 에드워드 존 스미스입니다. 한국어 1인칭으로 답하세요.",
        "환영 인사는 이미 끝났습니다. 이름·직함·자기소개는 절대 하지 마세요.",
        "첫 문장부터 승객 질문에 대한 사실·숫자·설명으로 바로 답하세요.",
        "인사만 하거나 질문을 피하지 마세요.",
        f"참고 통계 — 전체 {total:,}명, 생존 {survived:,}명, 사망 {perished:,}명.",
        "",
    ]

    for turn in history[-6:]:
        speaker = "승객" if turn.role == "user" else "선장"
        lines.append(f"{speaker}: {turn.text}")

    lines.append(f"승객: {message}")
    lines.append("선장 (질문에 바로 답변, 자기소개 없이):")
    return "\n".join(lines)
