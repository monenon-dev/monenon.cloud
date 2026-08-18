"""`/agent/chat` — 의도 분류 후 브리핑·주간 리포트 그래프 또는 일반 Gemini."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from gemini_caller import call_gemini
from core.matrix.vault_keymaker_secret_manager import get_keymaker
from orchestration.app.agent_system_prompt import with_agent_system_prompt
from orchestration.app.briefing.calendar_source import today_calendar_has_items
from orchestration.app.briefing.format import strip_briefing_title_heading, strip_example_data_disclaimer
from orchestration.app.briefing.demo_schedule import (
    format_seed_done_prefix,
    format_seed_offer_markdown,
    is_seed_schedule_accept,
    is_seed_schedule_decline,
    seed_demo_calendar,
)
from orchestration.app.chat_context import augment_prompt_with_user_context
from orchestration.app.chat_intent_router import ChatIntent, classify_chat_intent
from orchestration.app.use_cases.get_or_create_today_briefing import (
    get_or_create_today_briefing,
)
from orchestration.app.use_cases.run_weekly_report import run_weekly_report
from orchestration.app.weekly_report.format import format_weekly_report_markdown

logger = logging.getLogger(__name__)

_DEFAULT_BRIEFING_QUERY = "오늘 일정과 할 일 기준으로 업무 브리핑을 작성해 줘"


def _chat_response(
    *,
    response_type: str,
    content: str,
    tool_logs: list[Any] | None = None,
    risks: list[Any] | None = None,
    next_actions: list[Any] | None = None,
    intent: ChatIntent | None = None,
    pending_review: dict[str, str] | None = None,
    briefing_id: int | None = None,
    user_notes: str | None = None,
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
    if pending_review is not None:
        payload["pending_review"] = pending_review
    if briefing_id is not None:
        payload["briefing_id"] = briefing_id
    if user_notes is not None:
        payload["user_notes"] = user_notes
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


async def _run_briefing_response(
    session: AsyncSession,
    *,
    user_id: int,
    query: str,
    speech_tone: str | None,
    user_type: str | None,
    industry: str | None,
    force_refresh: bool,
    content_prefix: str = "",
) -> dict[str, Any]:
    briefing = await get_or_create_today_briefing(
        session,
        user_id=user_id,
        query=query,
        speech_tone=speech_tone,
        user_type=user_type,
        industry=industry,
        force_refresh=force_refresh,
    )
    body = strip_example_data_disclaimer(
        strip_briefing_title_heading((briefing.get("content") or "").strip())
    )
    content = f"{content_prefix}{body}".strip() if body else content_prefix.strip()
    return _chat_response(
        response_type="briefing",
        content=content,
        tool_logs=briefing.get("tool_logs"),
        intent="briefing_request",
        pending_review=briefing.get("pending_review"),
        briefing_id=briefing.get("id"),
        user_notes=briefing.get("user_notes") or "",
    )


async def run_agent_chat(
    session: AsyncSession,
    *,
    prompt: str,
    user_id: int | None = None,
    speech_tone: str | None = None,
    user_type: str | None = None,
    industry: str | None = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """의도에 따라 브리핑·주간 리포트 서브그래프 또는 일반 Gemini를 호출한다."""
    text = (prompt or "").strip()
    if not text:
        raise ValueError("prompt가 비어 있습니다.")

    # 데모 일정 제안 거절
    if is_seed_schedule_decline(text):
        return _chat_response(
            response_type="chat",
            content=(
                "알겠습니다. 톡캘린더를 연동하거나 일정을 추가한 뒤 "
                "다시 브리핑을 요청해 주세요."
            ),
            tool_logs=[],
            intent="general_chat",
        )

    # 데모 일정 수락 → 일정 심고 브리핑 재생성
    if user_id is not None and is_seed_schedule_accept(text):
        items = await seed_demo_calendar(session, user_id)
        logger.info(
            "[agent_chat] demo calendar seeded user_id=%s items=%s",
            user_id,
            len(items),
        )
        return await _run_briefing_response(
            session,
            user_id=user_id,
            query=_DEFAULT_BRIEFING_QUERY,
            speech_tone=speech_tone,
            user_type=user_type,
            industry=industry,
            force_refresh=True,
            content_prefix=format_seed_done_prefix(items),
        )

    intent = classify_chat_intent(text)
    logger.info(
        "[agent_chat] intent=%s user_id=%s force_refresh=%s",
        intent,
        user_id,
        force_refresh,
    )

    if intent == "briefing_request" and user_id is not None:
        has_cal = await today_calendar_has_items(session, user_id)
        if not has_cal:
            logger.info(
                "[agent_chat] empty calendar — offering demo seed user_id=%s",
                user_id,
            )
            return _chat_response(
                response_type="needs_data",
                content=format_seed_offer_markdown(),
                tool_logs=[],
                intent=intent,
                next_actions=[
                    {
                        "title": "네, 만들어 줘",
                        "priority": "high",
                        "detail": "오늘 데모 일정을 만들고 브리핑을 생성합니다.",
                    },
                    {
                        "title": "아니요",
                        "priority": "low",
                        "detail": "일정 없이 넘어갑니다.",
                    },
                ],
            )
        return await _run_briefing_response(
            session,
            user_id=user_id,
            query=text,
            speech_tone=speech_tone,
            user_type=user_type,
            industry=industry,
            force_refresh=force_refresh,
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
