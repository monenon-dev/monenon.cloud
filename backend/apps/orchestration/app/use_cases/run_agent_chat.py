"""`/agent/chat` — 의도 분류 후 브리핑·주간 리포트 그래프 또는 일반 Gemini."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from gemini_caller import call_gemini
from core.matrix.vault_keymaker_secret_manager import get_keymaker
from orchestration.app.agent_system_prompt import with_agent_system_prompt
from orchestration.app.chat_context import augment_prompt_with_user_context
from orchestration.app.chat_intent_router import ChatIntent, classify_chat_intent
from orchestration.app.use_cases.get_or_create_today_briefing import (
    get_or_create_today_briefing,
)
from orchestration.app.use_cases.run_weekly_report import run_weekly_report
from orchestration.app.weekly_report.format import format_weekly_report_markdown

logger = logging.getLogger(__name__)


def _chat_response(
    *,
    response_type: str,
    content: str,
    tool_logs: list[Any] | None = None,
    risks: list[Any] | None = None,
    next_actions: list[Any] | None = None,
    intent: ChatIntent | None = None,
) -> dict[str, Any]:
    logs = tool_logs if isinstance(tool_logs, list) else []
    payload: dict[str, Any] = {
        "type": response_type,
        "content": content,
        "tool_logs": logs,
        "answer": content,
        "confidence": 0.0,
        "sources": [],
    }
    if intent:
        payload["intent"] = intent
    if risks is not None:
        payload["risks"] = risks
    if next_actions is not None:
        payload["next_actions"] = next_actions
    return payload


async def _run_general_chat(
    session: AsyncSession,
    *,
    prompt: str,
    user_id: int | None,
    speech_tone: str | None,
    user_type: str | None,
    industry: str | None,
    intent: ChatIntent,
) -> dict[str, Any]:
    augmented = prompt
    if user_id is not None:
        augmented = await augment_prompt_with_user_context(session, user_id, prompt)
    final_prompt = with_agent_system_prompt(
        augmented,
        speech_tone=speech_tone,
        user_type=user_type,
        industry=industry,
    )
    answer = call_gemini(final_prompt, model=get_keymaker().gemini_chat_model_id())
    return _chat_response(
        response_type="chat",
        content=answer,
        tool_logs=[],
        intent=intent,
    )


async def run_agent_chat(
    session: AsyncSession,
    *,
    prompt: str,
    user_id: int | None = None,
    speech_tone: str | None = None,
    user_type: str | None = None,
    industry: str | None = None,
) -> dict[str, Any]:
    """의도에 따라 브리핑·주간 리포트 서브그래프 또는 일반 Gemini를 호출한다."""
    text = (prompt or "").strip()
    if not text:
        raise ValueError("prompt가 비어 있습니다.")

    intent = classify_chat_intent(text)
    logger.info("[agent_chat] intent=%s user_id=%s", intent, user_id)

    if intent == "briefing_request" and user_id is not None:
        briefing = await get_or_create_today_briefing(
            session,
            user_id=user_id,
            query=text,
            speech_tone=speech_tone,
            user_type=user_type,
            industry=industry,
        )
        body = (briefing.get("content") or "").strip()
        content = f"## 오늘의 브리핑\n\n{body}".strip() if body else "## 오늘의 브리핑"
        return _chat_response(
            response_type="briefing",
            content=content,
            tool_logs=briefing.get("tool_logs"),
            intent=intent,
        )

    if intent == "report_request" and user_id is not None:
        report = await run_weekly_report(
            session=session,
            user_id=user_id,
            speech_tone=speech_tone,
            user_type=user_type,
            industry=industry,
        )
        content = format_weekly_report_markdown(report)
        return _chat_response(
            response_type="report",
            content=content,
            tool_logs=report.get("tool_logs"),
            risks=report.get("risks"),
            next_actions=report.get("next_actions"),
            intent=intent,
        )

    if intent in ("briefing_request", "report_request") and user_id is None:
        logger.info("[agent_chat] routed intent=%s but no user_id — general_chat", intent)

    return await _run_general_chat(
        session,
        prompt=text,
        user_id=user_id,
        speech_tone=speech_tone,
        user_type=user_type,
        industry=industry,
        intent="general_chat",
    )
