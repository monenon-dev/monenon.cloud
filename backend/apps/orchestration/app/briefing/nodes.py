"""LangGraph 브리핑 에이전트 노드 — Router / Tools / Synthesizer / Validator."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from core.matrix.vault_keymaker_secret_manager import get_keymaker
from gemini_caller import call_gemini
from orchestration.app.agent_system_prompt import with_agent_system_prompt
from orchestration.app.briefing.calendar_source import fetch_today_calendar
from orchestration.app.briefing.docs_source import fetch_recent_docs
from orchestration.app.briefing.history_source import fetch_recent_history
from orchestration.app.briefing.state import BriefingState
from orchestration.app.briefing.tool_logs import build_tool_logs

logger = logging.getLogger(__name__)

_ALL_TOOLS = ("calendar", "docs", "history")


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


def _normalize_tools(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return list(_ALL_TOOLS)
    picked = [str(x).strip().lower() for x in raw if str(x).strip().lower() in _ALL_TOOLS]
    return picked or list(_ALL_TOOLS)


async def router_node(state: BriefingState) -> dict:
    """최근 맥락을 보고 브리핑에 포함할 도구를 고른다."""
    query = (state.get("query") or "").strip()
    system = (
        "[역할] 브리핑 라우터. 사용자 요청과 맥락을 보고 실행할 도구만 고릅니다.\n"
        '형식: {"selected_tools":["calendar","docs","history"], "reason":"..."}\n'
        "도구: calendar(오늘 일정), docs(문서 변경), history(최근 대화)."
    )
    user = f"브리핑 요청: {query or '오늘의 업무 브리핑'}"
    try:
        parsed = _call_agent_json(system, user)
        selected = _normalize_tools(parsed.get("selected_tools"))
        reason = parsed.get("reason") if isinstance(parsed.get("reason"), str) else ""
    except Exception as exc:
        logger.warning("[briefing_router] fallback all tools: %s", exc)
        selected = list(_ALL_TOOLS)
        reason = "router_fallback"

    return {
        "selected_tools": selected,
        "trace": [
            _trace(
                "router",
                intent="briefing",
                query=query[:200],
                selected_tools=selected,
                reason=reason[:200],
            )
        ],
    }


async def calendar_tool_node(state: BriefingState) -> dict:
    if "calendar" not in (state.get("selected_tools") or _ALL_TOOLS):
        return {
            "calendar_result": {
                "source": "calendar",
                "status": "skipped",
                "tool": "calendar.list",
                "items": [],
            },
            "trace": [_trace("calendar", status="skipped", tool="calendar.list")],
        }

    user_id = state.get("user_id")
    session = state.get("db_session")
    if user_id is not None and session is not None:
        result = await fetch_today_calendar(session, user_id)
        if result.get("status") == "success":
            return {"calendar_result": result, "trace": [_trace("calendar", tool="calendar.list")]}
        if result.get("status") in ("skipped", "error"):
            return {"calendar_result": result, "trace": [_trace("calendar", tool="calendar.list", status=result.get("status"))]}

    system = (
        "[역할] calendar.list 도구를 대신하는 캘린더 에이전트입니다.\n"
        '형식: {"items":[{"title":"...","meta":"HH:MM"}], "summary":"..."}'
    )
    user = f"브리핑 요청: {state.get('query', '')}"
    result = _call_agent_json(system, user)
    result.setdefault("source", "calendar")
    result.setdefault("status", "simulated")
    result.setdefault("tool", "calendar.list")
    return {"calendar_result": result, "trace": [_trace("calendar", tool="calendar.list")]}


async def docs_tool_node(state: BriefingState) -> dict:
    if "docs" not in (state.get("selected_tools") or _ALL_TOOLS):
        return {
            "docs_result": {
                "source": "docs",
                "status": "skipped",
                "tool": "docs.search",
                "items": [],
            },
            "trace": [_trace("docs", status="skipped", tool="docs.search")],
        }

    user_id = state.get("user_id")
    result = await fetch_recent_docs(user_id)
    if result.get("status") == "skipped":
        return {"docs_result": result, "trace": [_trace("docs", tool="docs.search", status="skipped")]}

    system = (
        "[역할] docs.search RAG 도구를 대신하는 문서 에이전트입니다.\n"
        '형식: {"items":[{"title":"...","preview":"...","score":0.0}], "summary":"..."}'
    )
    user = (
        f"브리핑 요청: {state.get('query', '')}\n"
        f"캘린더 요약: {state.get('calendar_result', {})}"
    )
    sim = _call_agent_json(system, user)
    sim.setdefault("source", "docs")
    sim.setdefault("status", "simulated")
    sim.setdefault("tool", "docs.search")
    return {"docs_result": sim, "trace": [_trace("docs", tool="docs.search")]}


async def history_tool_node(state: BriefingState) -> dict:
    if "history" not in (state.get("selected_tools") or _ALL_TOOLS):
        return {
            "history_result": {
                "source": "history",
                "status": "skipped",
                "tool": "history.digest",
                "items": [],
            },
            "trace": [_trace("history", status="skipped", tool="history.digest")],
        }

    user_id = state.get("user_id")
    session = state.get("db_session")
    if user_id is not None and session is not None:
        result = await fetch_recent_history(session, user_id)
        return {
            "history_result": result,
            "slack_result": result,
            "trace": [_trace("history", tool="history.digest", status=result.get("status"))],
        }

    system = (
        "[역할] history.digest — 최근 대화 요약을 JSON으로 만듭니다.\n"
        '형식: {"items":[{"title":"...","preview":"..."}], "summary":"..."}'
    )
    user = f"브리핑 요청: {state.get('query', '')}"
    result = _call_agent_json(system, user)
    result.setdefault("source", "history")
    result.setdefault("status", "simulated")
    result.setdefault("tool", "history.digest")
    return {
        "history_result": result,
        "slack_result": result,
        "trace": [_trace("history", tool="history.digest")],
    }


def _evidence_blobs(state: BriefingState) -> list[str]:
    blobs: list[str] = []
    for key in ("calendar_result", "docs_result", "history_result", "slack_result"):
        data = state.get(key) or {}
        if not isinstance(data, dict):
            continue
        for item in data.get("items") or []:
            if isinstance(item, dict):
                for field in ("title", "preview", "meta", "summary"):
                    val = item.get(field)
                    if isinstance(val, str) and val.strip():
                        blobs.append(val.strip())
        summary = data.get("summary")
        if isinstance(summary, str) and summary.strip():
            blobs.append(summary.strip())
    return blobs


async def synthesizer_node(state: BriefingState) -> dict:
    calendar = state.get("calendar_result") or {}
    docs = state.get("docs_result") or {}
    history = state.get("history_result") or state.get("slack_result") or {}
    notes = (state.get("validation_notes") or "").strip()
    context = (
        f"[캘린더]\n{json.dumps(calendar, ensure_ascii=False)}\n\n"
        f"[문서]\n{json.dumps(docs, ensure_ascii=False)}\n\n"
        f"[최근 대화]\n{json.dumps(history, ensure_ascii=False)}"
    )
    repair = ""
    if notes:
        repair = (
            f"\n\n[검증 피드백]\n{notes}\n"
            "근거가 없는 문장은 삭제하고, 위 JSON에 있는 사실만 사용하세요."
        )
    user_prompt = (
        f"{(state.get('query') or '오늘의 업무 브리핑을 작성해 줘').strip()}\n\n"
        "아래 도구 수집 결과만 근거로 스탠드업 브리핑을 작성하세요.\n"
        "마크다운 헤딩·불릿을 쓰고, 근거 없는 추측은 넣지 마세요.\n\n"
        f"{context}{repair}"
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

    retries = int(state.get("synth_retries") or 0)
    return {
        "answer": answer,
        "synth_retries": retries + (1 if notes else 0),
        "trace": [_trace("synthesizer", tool="briefing.synthesize", retry=bool(notes))],
    }


async def validator_node(state: BriefingState) -> dict:
    """Synthesizer 결과가 도구 근거에 기반하는지 검사."""
    answer = (state.get("answer") or "").strip()
    evidence = _evidence_blobs(state)
    selected = state.get("selected_tools") or list(_ALL_TOOLS)

    if not answer:
        return {
            "validation_ok": False,
            "validation_notes": "브리핑 본문이 비어 있습니다.",
            "tool_logs": build_tool_logs(
                calendar=state.get("calendar_result"),
                docs=state.get("docs_result"),
                history=state.get("history_result") or state.get("slack_result"),
                selected_tools=selected,
            ),
            "trace": [_trace("validator", ok=False, reason="empty_answer")],
        }

    # 도구가 전부 skipped/empty면 합성문만으로 통과
    any_items = any(
        isinstance(state.get(k), dict) and (state.get(k) or {}).get("items")
        for k in ("calendar_result", "docs_result", "history_result", "slack_result")
    )
    if not any_items:
        logs = build_tool_logs(
            calendar=state.get("calendar_result"),
            docs=state.get("docs_result"),
            history=state.get("history_result") or state.get("slack_result"),
            selected_tools=selected,
        )
        return {
            "validation_ok": True,
            "validation_notes": "",
            "tool_logs": logs,
            "trace": [_trace("validator", ok=True, reason="no_tool_items")],
        }

    # 휴리스틱: 본문 명사성 토큰이 근거에 얼마나 겹치는지
    tokens = [t for t in re.findall(r"[가-힣A-Za-z0-9]{2,}", answer) if len(t) >= 2]
    joined = " ".join(evidence).lower()
    hits = sum(1 for t in tokens if t.lower() in joined)
    ratio = hits / max(len(tokens), 1)
    retries = int(state.get("synth_retries") or 0)
    ok = ratio >= 0.08 or retries >= 2

    notes = ""
    if not ok:
        notes = (
            f"근거 겹침이 낮습니다(ratio={ratio:.2f}). "
            "캘린더·문서·대화 JSON에 없는 고유명사/사실은 제거하세요."
        )

    logs = build_tool_logs(
        calendar=state.get("calendar_result"),
        docs=state.get("docs_result"),
        history=state.get("history_result") or state.get("slack_result"),
        selected_tools=selected,
    )
    return {
        "validation_ok": ok,
        "validation_notes": notes,
        "tool_logs": logs,
        "trace": [_trace("validator", ok=ok, ratio=round(ratio, 3), retries=retries)],
    }
