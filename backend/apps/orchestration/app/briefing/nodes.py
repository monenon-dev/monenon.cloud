"""LangGraph 브리핑 에이전트 노드."""

from __future__ import annotations

import json
import logging
from typing import Any

from core.matrix.vault_keymaker_secret_manager import get_keymaker
from gemini_caller import call_gemini
from orchestration.app.agent_system_prompt import with_agent_system_prompt
from orchestration.app.briefing.calendar_source import fetch_today_calendar
from orchestration.app.briefing.state import BriefingState

logger = logging.getLogger(__name__)


def _trace(node: str, *, status: str = "done", **extra: Any) -> dict:
    return {"node": node, "status": status, **extra}


def _call_agent_json(system: str, user: str) -> dict:
    prompt = f"{system.strip()}\n\n{user.strip()}\n\nJSON만 반환하세요."
    raw = call_gemini(prompt, model=get_keymaker().gemini_chat_model_id())
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {"items": parsed}
    except json.JSONDecodeError:
        return {"summary": raw, "items": []}


async def router_node(state: BriefingState) -> dict:
    query = (state.get("query") or "").strip()
    return {
        "trace": [
            _trace(
                "router",
                intent="briefing",
                query=query[:200],
            )
        ],
    }


async def calendar_agent_node(state: BriefingState) -> dict:
    user_id = state.get("user_id")
    session = state.get("db_session")
    if user_id is not None and session is not None:
        result = await fetch_today_calendar(session, user_id)
        if result.get("status") == "success" and result.get("items"):
            return {"calendar_result": result, "trace": [_trace("calendar", tool="calendar.list")]}

    system = (
        "[역할] calendar.list 도구를 대신하는 캘린더 에이전트입니다. "
        "사용자 브리핑 요청에 맞는 오늘 일정 목록을 JSON으로 만듭니다.\n"
        '형식: {"items":[{"title":"...","meta":"HH:MM"}], "summary":"..."}'
    )
    user = f"브리핑 요청: {state.get('query', '')}"
    result = _call_agent_json(system, user)
    result.setdefault("source", "calendar")
    result.setdefault("status", "simulated")
    result.setdefault("tool", "calendar.list")
    return {"calendar_result": result, "trace": [_trace("calendar", tool="calendar.list")]}


async def docs_agent_node(state: BriefingState) -> dict:
    system = (
        "[역할] docs.search RAG 도구를 대신하는 문서 에이전트입니다. "
        "브리핑에 필요한 문서 검색 결과를 JSON으로 만듭니다.\n"
        '형식: {"items":[{"title":"...","preview":"...","score":0.0}], "summary":"..."}'
    )
    user = f"브리핑 요청: {state.get('query', '')}\n캘린더 요약: {state.get('calendar_result', {})}"
    result = _call_agent_json(system, user)
    result.setdefault("source", "docs")
    result.setdefault("status", "simulated")
    result.setdefault("tool", "docs.search")
    return {"docs_result": result, "trace": [_trace("docs", tool="docs.search")]}


async def slack_agent_node(state: BriefingState) -> dict:
    system = (
        "[역할] slack.digest 도구를 대신하는 Slack 에이전트입니다. "
        "채널별 메시지 요약을 JSON으로 만듭니다.\n"
        '형식: {"items":[{"title":"#channel","meta":"N msgs"}], "summary":"..."}'
    )
    user = f"브리핑 요청: {state.get('query', '')}"
    result = _call_agent_json(system, user)
    result.setdefault("source", "slack")
    result.setdefault("status", "simulated")
    result.setdefault("tool", "slack.digest")
    return {"slack_result": result, "trace": [_trace("slack", tool="slack.digest")]}


async def synthesizer_node(state: BriefingState) -> dict:
    calendar = state.get("calendar_result") or {}
    docs = state.get("docs_result") or {}
    slack = state.get("slack_result") or {}
    context = (
        f"[캘린더]\n{json.dumps(calendar, ensure_ascii=False)}\n\n"
        f"[문서]\n{json.dumps(docs, ensure_ascii=False)}\n\n"
        f"[Slack]\n{json.dumps(slack, ensure_ascii=False)}"
    )
    user_prompt = (
        f"{state.get('query', '').strip()}\n\n"
        f"아래 에이전트 수집 결과를 바탕으로 스탠드업 브리핑을 작성하세요.\n"
        f"마크다운 헤딩·불릿을 사용하고 액션 아이템을 명확히 정리하세요.\n\n"
        f"{context}"
    )
    prompt = with_agent_system_prompt(
        user_prompt,
        speech_tone=state.get("speech_tone"),
        user_type=state.get("user_type"),
        industry=state.get("industry"),
    )
    try:
        answer = call_gemini(prompt, model=get_keymaker().gemini_chat_model_id())
    except Exception as exc:
        logger.exception("[briefing_synthesizer] gemini failed: %s", exc)
        answer = "브리핑 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    return {
        "answer": answer,
        "trace": [_trace("synthesizer", tool="briefing.synthesize")],
    }
