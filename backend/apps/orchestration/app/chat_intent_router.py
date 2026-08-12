"""`/agent/chat` 의도 분류 — 키워드 우선, 애매하면 선택적 LLM 폴백."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Literal

from gemini_caller import call_gemini
from core.matrix.vault_keymaker_secret_manager import get_keymaker

logger = logging.getLogger(__name__)

ChatIntent = Literal["briefing_request", "report_request", "general_chat"]

_BRIEFING_RULES: list[tuple[re.Pattern[str], int]] = [
    (re.compile(r"브리핑", re.I), 4),
    (re.compile(r"briefing", re.I), 4),
    (re.compile(r"오늘\s*(뭐|해야|할\s*일|일정|업무|하루|스탠드업)", re.I), 3),
    (re.compile(r"스탠드업", re.I), 3),
    (re.compile(r"(다시\s*)?보여\s*줘", re.I), 2),
    (re.compile(r"오늘\s*정리", re.I), 2),
]

_REPORT_RULES: list[tuple[re.Pattern[str], int]] = [
    (re.compile(r"주간\s*리포트", re.I), 5),
    (re.compile(r"weekly\s*report", re.I), 5),
    (re.compile(r"이번\s*주.*(리포트|정리|요약|보고)", re.I), 4),
    (re.compile(r"(리포트|보고서).*(만들|생성|작성|줘)", re.I), 4),
    (re.compile(r"이번\s*주", re.I), 2),
    (re.compile(r"주간\s*(정리|업무|요약)", re.I), 3),
    (re.compile(r"7\s*일|일주일", re.I), 2),
]


def _score_rules(text: str, rules: list[tuple[re.Pattern[str], int]]) -> int:
    total = 0
    for pattern, weight in rules:
        if pattern.search(text):
            total += weight
    return total


def classify_chat_intent_rules(prompt: str) -> tuple[ChatIntent, int, int]:
    """키워드 점수로 의도 추정. (intent, briefing_score, report_score)"""
    text = (prompt or "").strip()
    if not text:
        return "general_chat", 0, 0

    briefing_score = _score_rules(text, _BRIEFING_RULES)
    report_score = _score_rules(text, _REPORT_RULES)

    if report_score >= 4 and report_score > briefing_score:
        return "report_request", briefing_score, report_score
    if briefing_score >= 3 and briefing_score >= report_score:
        return "briefing_request", briefing_score, report_score
    if report_score >= 3 and report_score > briefing_score:
        return "report_request", briefing_score, report_score

    return "general_chat", briefing_score, report_score


def _llm_enabled() -> bool:
    return os.getenv("CHAT_INTENT_LLM_ENABLED", "1").strip().lower() not in (
        "0",
        "false",
        "off",
        "no",
    )


def _classify_with_llm(prompt: str) -> ChatIntent | None:
    system = (
        "사용자 메시지 의도를 JSON 하나로만 분류한다.\n"
        '형식: {"intent":"briefing_request"|"report_request"|"general_chat"}\n'
        "- briefing_request: 오늘 브리핑·오늘 할 일·오늘 일정 다시 보기\n"
        "- report_request: 주간·이번 주 업무 리포트 생성\n"
        "- general_chat: 그 외 일반 대화"
    )
    try:
        raw = call_gemini(
            f"{system}\n\n사용자: {prompt.strip()[:500]}",
            model=get_keymaker().gemini_chat_model_id(),
        )
        text = raw.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)
        intent = data.get("intent")
        if intent in ("briefing_request", "report_request", "general_chat"):
            return intent
    except Exception as exc:
        logger.warning("[chat_intent] llm classify failed: %s", exc)
    return None


def classify_chat_intent(prompt: str) -> ChatIntent:
    """키워드 우선 분류. 애매하고 양쪽 점수가 낮지 않으면 LLM 폴백."""
    intent, briefing_score, report_score = classify_chat_intent_rules(prompt)
    if intent != "general_chat":
        return intent

    weak_signal = briefing_score > 0 or report_score > 0
    if weak_signal and _llm_enabled():
        llm_intent = _classify_with_llm(prompt)
        if llm_intent:
            return llm_intent

    return "general_chat"
