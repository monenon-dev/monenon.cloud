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
from orchestration.app.briefing.format import format_today_ko, strip_briefing_title_heading
from orchestration.app.briefing.gmail_source import fetch_gmail_digest
from orchestration.app.briefing.history_source import fetch_recent_history
from orchestration.app.briefing.slack_source import fetch_slack_digest
from orchestration.app.briefing.state import BriefingState
from orchestration.app.briefing.validator_review import build_pending_review_payload
from orchestration.app.briefing.tool_logs import (
    events_for_tool_node,
    make_node_event,
)

logger = logging.getLogger(__name__)

_ALL_TOOLS = ("calendar", "docs", "history", "slack", "gmail")

SYNTH_ERROR_MARKER = "브리핑 생성 중 오류가 발생했습니다"

# 데모/면접용: docs 비어 있을 때 1차 synthesizer가 문서 근거를 지어내도록 삽입
_DOCS_HALLUCINATION_SNIPPET = (
    "문서 저장소의 Q3 로드맵(q3-roadmap.md)에 따르면 "
    "North-star KPI는 브리핑 목표 시간 45초 미만이라고 명시되어 있습니다."
)
_DOCS_HALLUCINATION_MARKERS = (
    "문서 저장소",
    "q3-roadmap",
    "Q3 로드맵",
    "North-star KPI",
    "브리핑 목표 시간 45초",
)


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


def _docs_empty(state: BriefingState) -> bool:
    docs = state.get("docs_result") or {}
    if not isinstance(docs, dict):
        return True
    items = docs.get("items")
    if isinstance(items, list) and len(items) > 0:
        return False
    return True


def _answer_has_docs_hallucination(answer: str) -> bool:
    lower = answer.lower()
    for marker in _DOCS_HALLUCINATION_MARKERS:
        if marker.lower() in lower:
            return True
    return False


async def router_node(state: BriefingState) -> dict:
    """최근 맥락을 보고 브리핑에 포함할 도구를 고른다."""
    query = (state.get("query") or "").strip()
    system = (
        "[역할] 브리핑 라우터. 사용자 요청과 맥락을 보고 실행할 도구만 고릅니다.\n"
        '형식: {"selected_tools":["calendar","docs","history","slack","gmail"], "reason":"..."}\n'
        "도구: calendar(오늘 일정), docs(문서 변경), history(최근 대화), "
        "slack(Slack digest), gmail(미읽음 메일)."
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

    detail = f"브리핑 항목 결정: {', '.join(selected)}"
    if reason:
        detail = f"{detail} — {reason[:80]}"

    return {
        "selected_tools": selected,
        "tool_logs": [
            make_node_event(
                "router",
                status="success",
                detail=detail,
                attempt=1,
                params={"tools": len(selected)},
                result={
                    "type": "list",
                    "items": [{"title": t, "meta": "selected"} for t in selected],
                },
                seq=0,
            )
        ],
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
    """LangGraph calendar 노드 — 오늘 톡캘린더 일정을 수집한다.

    router가 선택하지 않았으면 ``not_selected`` 로 skip.
    DB·user_id 없으면 Gemini 시뮬레이션 fallback.
    연동 없음은 소스 레벨 ``skipped`` — 그래프는 계속 진행한다.
    """
    if "calendar" not in (state.get("selected_tools") or _ALL_TOOLS):
        result = {
            "source": "calendar",
            "status": "skipped",
            "tool": "calendar.list",
            "items": [],
            "reason": "not_selected",
        }
        return {
            "calendar_result": result,
            "tool_logs": events_for_tool_node("calendar", result, seq_base=10),
            "trace": [_trace("calendar", status="skipped", tool="calendar.list")],
        }

    user_id = state.get("user_id")
    session = state.get("db_session")
    if user_id is not None and session is not None:
        result = await fetch_today_calendar(session, user_id)
        if result.get("status") in ("success", "skipped", "error", "empty"):
            return {
                "calendar_result": result,
                "tool_logs": events_for_tool_node("calendar", result, seq_base=10),
                "trace": [
                    _trace(
                        "calendar",
                        tool="calendar.list",
                        status=result.get("status"),
                    )
                ],
            }

    system = (
        "[역할] calendar.list 도구를 대신하는 캘린더 에이전트입니다.\n"
        '형식: {"items":[{"title":"...","meta":"HH:MM"}], "summary":"..."}'
    )
    user = f"브리핑 요청: {state.get('query', '')}"
    result = _call_agent_json(system, user)
    result.setdefault("source", "calendar")
    result.setdefault("status", "simulated")
    result.setdefault("tool", "calendar.list")
    return {
        "calendar_result": result,
        "tool_logs": events_for_tool_node("calendar", result, seq_base=10),
        "trace": [_trace("calendar", tool="calendar.list")],
    }


async def docs_tool_node(state: BriefingState) -> dict:
    if "docs" not in (state.get("selected_tools") or _ALL_TOOLS):
        result = {
            "source": "docs",
            "status": "skipped",
            "tool": "docs.search",
            "items": [],
            "reason": "not_selected",
        }
        return {
            "docs_result": result,
            "tool_logs": events_for_tool_node("docs", result, seq_base=20),
            "trace": [_trace("docs", status="skipped", tool="docs.search")],
        }

    user_id = state.get("user_id")
    result = await fetch_recent_docs(user_id)
    if result.get("status") == "skipped":
        return {
            "docs_result": result,
            "tool_logs": events_for_tool_node("docs", result, seq_base=20),
            "trace": [_trace("docs", tool="docs.search", status="skipped")],
        }

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
    return {
        "docs_result": sim,
        "tool_logs": events_for_tool_node("docs", sim, seq_base=20),
        "trace": [_trace("docs", tool="docs.search")],
    }


async def history_tool_node(state: BriefingState) -> dict:
    if "history" not in (state.get("selected_tools") or _ALL_TOOLS):
        result = {
            "source": "history",
            "status": "skipped",
            "tool": "history.digest",
            "items": [],
            "reason": "not_selected",
        }
        return {
            "history_result": result,
            "tool_logs": events_for_tool_node("history", result, seq_base=30),
            "trace": [_trace("history", status="skipped", tool="history.digest")],
        }

    user_id = state.get("user_id")
    session = state.get("db_session")
    if user_id is not None and session is not None:
        result = await fetch_recent_history(session, user_id)
        return {
            "history_result": result,
            "tool_logs": events_for_tool_node("history", result, seq_base=30),
            "trace": [
                _trace(
                    "history",
                    tool="history.digest",
                    status=result.get("status"),
                )
            ],
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
        "tool_logs": events_for_tool_node("history", result, seq_base=30),
        "trace": [_trace("history", tool="history.digest")],
    }


async def slack_tool_node(state: BriefingState) -> dict:
    """LangGraph slack 노드 — 최근 24h Slack digest를 수집한다.

    미선택·미연동은 ``skipped`` (실패가 아님). synthesizer는 skipped 소스를 언급하지 않는다.
    API 오류만 ``error`` 이며, 그래프는 synthesizer까지 계속 진행한다.
    """
    if "slack" not in (state.get("selected_tools") or _ALL_TOOLS):
        result = {
            "source": "slack",
            "status": "skipped",
            "tool": "slack.digest",
            "items": [],
            "reason": "not_selected",
            "detail": "Slack 연동 안 됨",
        }
        return {
            "slack_summary": result,
            "slack_result": result,
            "tool_logs": events_for_tool_node("slack", result, seq_base=35),
            "trace": [_trace("slack", status="skipped", tool="slack.digest")],
        }

    user_id = state.get("user_id")
    session = state.get("db_session")
    if user_id is not None and session is not None:
        result = await fetch_slack_digest(session, user_id)
        return {
            "slack_summary": result,
            "slack_result": result,
            "tool_logs": events_for_tool_node("slack", result, seq_base=35),
            "trace": [
                _trace(
                    "slack",
                    tool="slack.digest",
                    status=result.get("status"),
                )
            ],
        }

    result = {
        "source": "slack",
        "status": "skipped",
        "tool": "slack.digest",
        "items": [],
        "reason": "not_connected",
        "detail": "Slack 연동 안 됨",
    }
    return {
        "slack_summary": result,
        "slack_result": result,
        "tool_logs": events_for_tool_node("slack", result, seq_base=35),
        "trace": [_trace("slack", status="skipped")],
    }


async def gmail_tool_node(state: BriefingState) -> dict:
    """LangGraph gmail 노드 — 최근 24h 미읽음 Gmail digest를 수집한다.

    미선택·미연동은 ``skipped``. 토큰 만료·OAuth 미설정은 소스가 skip/error 처리.
    브리핑 전체 실패로 이어지지 않으며, validator는 근거 없는 메일 언급을 걸러낸다.
    """
    if "gmail" not in (state.get("selected_tools") or _ALL_TOOLS):
        result = {
            "source": "gmail",
            "status": "skipped",
            "tool": "gmail.digest",
            "items": [],
            "reason": "not_selected",
            "detail": "Gmail 연동 안 됨",
        }
        return {
            "gmail_summary": result,
            "tool_logs": events_for_tool_node("gmail", result, seq_base=38),
            "trace": [_trace("gmail", status="skipped", tool="gmail.digest")],
        }

    user_id = state.get("user_id")
    session = state.get("db_session")
    if user_id is not None and session is not None:
        result = await fetch_gmail_digest(session, user_id)
        return {
            "gmail_summary": result,
            "tool_logs": events_for_tool_node("gmail", result, seq_base=38),
            "trace": [
                _trace(
                    "gmail",
                    tool="gmail.digest",
                    status=result.get("status"),
                )
            ],
        }

    result = {
        "source": "gmail",
        "status": "skipped",
        "tool": "gmail.digest",
        "items": [],
        "reason": "not_connected",
        "detail": "Gmail 연동 안 됨",
    }
    return {
        "gmail_summary": result,
        "tool_logs": events_for_tool_node("gmail", result, seq_base=38),
        "trace": [_trace("gmail", status="skipped")],
    }


def _source_skipped(data: dict | None) -> bool:
    if not isinstance(data, dict):
        return True
    return data.get("status") == "skipped"


def _source_empty(data: dict | None) -> bool:
    if not isinstance(data, dict):
        return True
    if data.get("status") == "skipped":
        return True
    items = data.get("items")
    return not isinstance(items, list) or len(items) == 0


def _source_items(data: Any) -> list[dict[str, Any]]:
    if not isinstance(data, dict):
        return []
    items = data.get("items")
    if not isinstance(items, list):
        return []
    return [x for x in items if isinstance(x, dict)]


def _is_synth_error_answer(answer: str) -> bool:
    """본문이 '생성 오류' 스텁이거나, 실질 내용이 오류 문구뿐인지 판별."""
    text = (answer or "").strip()
    if not text:
        return False
    if text.startswith(SYNTH_ERROR_MARKER):
        return True
    lines = [
        ln.strip()
        for ln in text.splitlines()
        if ln.strip() and not ln.strip().startswith("#")
    ]
    if not lines:
        return False
    error_lines = [ln for ln in lines if SYNTH_ERROR_MARKER in ln]
    if not error_lines:
        return False
    useful = [ln for ln in lines if SYNTH_ERROR_MARKER not in ln]
    return len(useful) == 0 or len(error_lines) >= max(1, len(useful))


def _fallback_briefing_from_sources(state: BriefingState) -> str:
    """Gemini 실패 시 도구 JSON만으로 만드는 최소 브리핑 초안."""
    sections: list[str] = []
    cal_items = _source_items(state.get("calendar_result"))
    hist_items = [
        item
        for item in _source_items(state.get("history_result"))
        if not _is_synth_error_answer(
            str(item.get("preview") or item.get("title") or "")
        )
    ]
    docs_items = _source_items(state.get("docs_result"))
    slack_raw = state.get("slack_summary") or state.get("slack_result")
    slack_items = _source_items(slack_raw)
    gmail_items = _source_items(state.get("gmail_summary"))

    if cal_items:
        sections.append("### 오늘 일정")
        for item in cal_items[:6]:
            title = str(item.get("title") or "일정").strip()
            meta = str(item.get("meta") or "").strip()
            sections.append(f"- {meta} {title}".strip() if meta else f"- {title}")
        sections.append("")
    if hist_items:
        sections.append("### 최근 대화에서")
        for item in hist_items[:4]:
            preview = str(item.get("preview") or item.get("title") or "").strip()
            if preview:
                sections.append(f"- {preview}")
        sections.append("")
    if docs_items:
        sections.append("### 문서")
        for item in docs_items[:4]:
            title = str(item.get("title") or "문서").strip()
            sections.append(f"- {title}")
        sections.append("")
    if slack_items and not _source_skipped(slack_raw if isinstance(slack_raw, dict) else None):
        sections.append("### Slack")
        for item in slack_items[:4]:
            title = str(item.get("title") or item.get("preview") or "").strip()
            if title:
                sections.append(f"- {title}")
        sections.append("")
    if gmail_items and not _source_skipped(state.get("gmail_summary")):
        sections.append("### Gmail")
        for item in gmail_items[:4]:
            title = str(item.get("title") or "").strip()
            if title:
                sections.append(f"- {title}")
        sections.append("")

    user_notes = (state.get("user_notes") or "").strip()
    if user_notes:
        sections.append("### 추가 메모")
        for line in user_notes.splitlines():
            text = line.strip()
            if text:
                sections.append(f"- {text}")
        sections.append("")

    body = "\n".join(sections).strip()
    cleaned_lines = [
        ln for ln in body.splitlines() if SYNTH_ERROR_MARKER not in ln
    ]
    body = "\n".join(cleaned_lines).strip()
    if not body:
        return (
            "연동된 일정·문서·메시지가 거의 없어 초안을 비워 두었습니다. "
            "일정을 추가하거나 연동 후 다시 생성해 주세요."
        )
    return body


def _evidence_blobs(state: BriefingState) -> list[str]:
    blobs: list[str] = []
    for key in (
        "calendar_result",
        "docs_result",
        "history_result",
        "slack_summary",
        "slack_result",
        "gmail_summary",
    ):
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
    user_notes = (state.get("user_notes") or "").strip()
    if user_notes:
        blobs.append(user_notes)
        for line in user_notes.splitlines():
            text = line.strip()
            if text:
                blobs.append(text)
    return blobs


async def synthesizer_node(state: BriefingState) -> dict:
    """LangGraph synthesizer 노드 — 수집된 도구 JSON만 근거로 브리핑 초안을 작성한다.

    validator 피드백(``validation_notes``)이 있으면 재합성(최대 validator 쪽에서 2회 재시도).
    skipped 소스는 프롬프트·컨텍스트에서 제외한다.
    Gemini 오류 시 도구 결과 기반 폴백 초안을 쓰고, 오류 문구만으로 끝내지 않는다.
    """
    calendar = state.get("calendar_result") or {}
    docs = state.get("docs_result") or {}
    history_raw = state.get("history_result") or {}
    # 과거 실패 브리핑 문구는 합성 근거에서 제외
    if isinstance(history_raw, dict):
        clean_items = [
            item
            for item in _source_items(history_raw)
            if not _is_synth_error_answer(
                str(item.get("preview") or item.get("title") or "")
            )
        ]
        history = {**history_raw, "items": clean_items}
    else:
        history = history_raw
    slack = state.get("slack_summary") or state.get("slack_result") or {}
    gmail = state.get("gmail_summary") or {}
    user_notes = (state.get("user_notes") or "").strip()
    notes = (state.get("validation_notes") or "").strip()
    pass_n = int(state.get("synth_pass") or 0) + 1
    is_retry = bool(notes) or pass_n > 1

    start_status = "retrying" if is_retry else "running"
    start_detail = (
        f"{pass_n}차 시도 — 검증 피드백 반영해 재합성"
        if is_retry
        else f"{pass_n}차 시도 — 도구 결과로 브리핑 합성 중"
    )
    start_event = make_node_event(
        "synthesizer",
        status=start_status,
        detail=start_detail,
        attempt=pass_n,
        params={"pass": pass_n},
        seq=40 + pass_n * 10,
    )

    context_parts = [
        ("캘린더", calendar),
        ("문서", docs),
        ("최근 대화", history),
    ]
    if not _source_skipped(slack):
        context_parts.append(("Slack", slack))
    if not _source_skipped(gmail):
        context_parts.append(("Gmail", gmail))
    if user_notes:
        context_parts.append(
            (
                "사용자 추가 메모",
                {
                    "source": "user_notes",
                    "status": "success",
                    "items": [{"preview": user_notes}],
                },
            )
        )

    context = "\n\n".join(
        f"[{label}]\n{json.dumps(payload, ensure_ascii=False)}"
        for label, payload in context_parts
    )
    repair = ""
    if notes:
        repair = (
            f"\n\n[검증 피드백]\n{notes}\n"
            "근거가 없는 문장은 삭제하고, 위 JSON에 있는 사실만 사용하세요. "
            "특히 문서 소스가 비어 있으면 문서·로드맵·RAG 관련 서술을 넣지 마세요."
        )
    user_prompt = (
        f"{(state.get('query') or '오늘의 업무 브리핑을 작성해 줘').strip()}\n\n"
        f"오늘 날짜는 {format_today_ko()} 입니다. 본문 맨 위 날짜는 반드시 이 날짜로 쓰세요.\n"
        "아래 도구 수집 결과만 근거로 스탠드업 브리핑을 작성하세요.\n"
        "본문은 날짜와 일정·할 일부터 시작하고, "
        "「오늘의 브리핑」「오늘의 업무 브리핑」 같은 제목 헤딩은 넣지 마세요.\n"
        "연동되지 않은 소스(Slack/Gmail 등 skipped)는 언급하지 말고 자연스럽게 생략하세요.\n"
        "사용자 추가 메모가 있으면 「오늘의 할 일」에 반영하되, 메모에 없는 내용은 만들지 마세요.\n"
        "마크다운 헤딩·불릿을 쓰고, 근거 없는 추측은 넣지 마세요.\n\n"
        f"{context}{repair}"
    )
    prompt = with_agent_system_prompt(
        user_prompt,
        speech_tone=state.get("speech_tone"),
        user_type=state.get("user_type"),
        industry=state.get("industry"),
    )

    used_fallback = False
    gemini_error: str | None = None
    try:
        answer = call_gemini(prompt, model=get_keymaker().gemini_chat_model_id())
        answer = strip_briefing_title_heading(answer)
    except Exception as exc:
        logger.exception("[briefing_synthesizer] gemini failed: %s", exc)
        gemini_error = str(exc)
        answer = _fallback_briefing_from_sources(state)
        used_fallback = True

    # 의도적 실패 시나리오: docs 비어 있고 1차 합성이면 문서 환각 문장 삽입
    # (오류 스텁에는 붙이지 않음 — 검토 UI가 깨짐)
    injected = False
    if (
        pass_n == 1
        and _docs_empty(state)
        and not notes
        and not _is_synth_error_answer(answer)
    ):
        if _DOCS_HALLUCINATION_SNIPPET not in answer:
            answer = f"{answer.rstrip()}\n\n{_DOCS_HALLUCINATION_SNIPPET}"
            injected = True

    answer = strip_briefing_title_heading(answer)

    retries = int(state.get("synth_retries") or 0)
    done_detail = f"{pass_n}차 브리핑 초안 생성 완료"
    if used_fallback:
        done_detail = f"{pass_n}차 초안 — Gemini 실패로 도구 결과 폴백 사용"
    if injected:
        done_detail += " (문서 미연동 데모: 근거 없는 문서 서술 포함)"

    tool_logs = [start_event]
    if gemini_error:
        tool_logs.append(
            make_node_event(
                "synthesizer",
                status="failed",
                detail=f"Gemini 호출 실패 → 폴백 초안 사용: {gemini_error[:120]}",
                attempt=pass_n,
                params={"pass": pass_n, "fallback": 1},
                error={"code": "GEMINI_FAILED", "message": gemini_error[:240]},
                seq=40 + pass_n * 10 + 1,
            )
        )
    tool_logs.append(
        make_node_event(
            "synthesizer",
            status="success",
            detail=done_detail,
            attempt=pass_n,
            params={
                "pass": pass_n,
                "chars": len(answer),
                "fallback": 1 if used_fallback else 0,
                "injected": 1 if injected else 0,
            },
            result={
                "type": "draft",
                "items": [
                    {
                        "title": f"브리핑 초안 · {pass_n}차",
                        "preview": answer[:160] + ("…" if len(answer) > 160 else ""),
                    }
                ],
            },
            seq=41 + pass_n * 10,
        )
    )

    return {
        "answer": answer,
        "synth_pass": pass_n,
        "synth_retries": retries + (1 if notes else 0),
        "tool_logs": tool_logs,
        "trace": [
            _trace(
                "synthesizer",
                tool="briefing.synthesize",
                retry=is_retry,
                pass_n=pass_n,
                injected=injected,
                fallback=used_fallback,
            )
        ],
    }


async def validator_node(state: BriefingState) -> dict:
    """LangGraph validator 노드 — synthesizer 초안이 도구 근거와 일치하는지 검사한다.

    synthesizer와 역할을 분리해 생성 측이 스스로 완료를 과대 보고하지 않게 한다.
    auto 모드: 실패 시 synthesizer 재호출(최대 2회). review 모드: 재시도 없이
    ``pending_review`` 로 보류하고 검증된 본문만 ``answer`` 에 남긴다.
    문서 환각(q3-roadmap 등)은 채팅/검토 UI에 넣지 않고 tool stream에만 기록한 뒤 본문에서 제거한다.
    """
    answer = (state.get("answer") or "").strip()
    evidence = _evidence_blobs(state)
    pass_n = max(1, int(state.get("synth_pass") or 1))
    retries = int(state.get("synth_retries") or 0)
    max_retries_hit = retries >= 2

    running = make_node_event(
        "validator",
        status="running",
        detail=f"{pass_n}차 초안 검증 중…",
        attempt=pass_n,
        params={"pass": pass_n},
        seq=50 + pass_n * 10,
    )

    if not answer:
        notes = "브리핑 본문이 비어 있습니다."
        if max_retries_hit:
            return {
                "validation_ok": True,
                "validation_notes": notes,
                "tool_logs": [
                    running,
                    make_node_event(
                        "validator",
                        status="success",
                        detail="최종 승인 (경고 포함) — 본문 비어 있음, 재시도 한도 도달",
                        attempt=pass_n,
                        params={"pass": pass_n, "forced": 1},
                        result={
                            "type": "list",
                            "items": [{"title": "경고", "preview": notes}],
                        },
                        seq=51 + pass_n * 10,
                    ),
                ],
                "trace": [_trace("validator", ok=True, reason="empty_forced")],
            }
        return {
            "validation_ok": False,
            "validation_notes": notes,
            "tool_logs": [
                running,
                make_node_event(
                    "validator",
                    status="failed",
                    detail=f"검증 실패: {notes} → synthesizer 재호출",
                    attempt=pass_n,
                    params={"pass": pass_n},
                    error={"code": "VALIDATION_FAILED", "message": notes},
                    seq=51 + pass_n * 10,
                ),
            ],
            "trace": [_trace("validator", ok=False, reason="empty_answer")],
        }

    if _is_synth_error_answer(answer):
        notes = "합성 엔진 오류 문구가 본문에 남아 있습니다."
        return {
            "validation_ok": False,
            "validation_notes": notes,
            "tool_logs": [
                running,
                make_node_event(
                    "validator",
                    status="failed",
                    detail=f"검증 실패: {notes} → synthesizer 재호출",
                    attempt=pass_n,
                    params={"pass": pass_n},
                    error={"code": "SYNTH_ERROR_STUB", "message": notes},
                    seq=51 + pass_n * 10,
                ),
            ],
            "trace": [_trace("validator", ok=False, reason="synth_error_stub")],
        }

    failure_reasons: list[str] = []

    # 데모 시나리오: 문서 소스 없음 + 문서 환각 서술
    if _docs_empty(state) and _answer_has_docs_hallucination(answer):
        failure_reasons.append(
            "문서 인용 근거 없음 (문서 소스가 비어 있는데 문서·로드맵 서술이 포함됨)"
        )

    if _source_empty(state.get("slack_summary") or state.get("slack_result")):
        if re.search(r"슬랙|slack|#\w+", answer, re.IGNORECASE):
            failure_reasons.append(
                "Slack 인용 근거 없음 (Slack 연동·메시지 없이 Slack 서술 포함)"
            )

    if _source_empty(state.get("gmail_summary")):
        if re.search(r"gmail|이메일\s*함|메일\s*함|inbox", answer, re.IGNORECASE):
            failure_reasons.append(
                "Gmail 인용 근거 없음 (Gmail 연동·메일 없이 메일함 서술 포함)"
            )

    any_items = any(
        isinstance(state.get(k), dict) and (state.get(k) or {}).get("items")
        for k in (
            "calendar_result",
            "docs_result",
            "history_result",
            "slack_summary",
            "slack_result",
            "gmail_summary",
        )
    )

    ratio = 1.0
    if any_items:
        tokens = [t for t in re.findall(r"[가-힣A-Za-z0-9]{2,}", answer) if len(t) >= 2]
        joined = " ".join(evidence).lower()
        hits = sum(1 for t in tokens if t.lower() in joined)
        ratio = hits / max(len(tokens), 1)
        if ratio < 0.08 and not failure_reasons:
            failure_reasons.append(
                f"도구 결과와 겹치는 근거가 부족함 (ratio={ratio:.2f})"
            )

    # 문서 환각은 채팅·검토 카드에 노출하지 않고 tool stream에만 남긴 뒤 본문에서 제거한다.
    docs_strip_logs: list[dict[str, Any]] = []
    docs_notes = ""
    if any("문서 인용 근거 없음" in r for r in failure_reasons):
        clean_answer, docs_pending = build_pending_review_payload(
            answer,
            [r for r in failure_reasons if "문서 인용 근거 없음" in r],
        )
        flagged = (docs_pending.get("content") or "").strip()
        docs_notes = next(
            (r for r in failure_reasons if "문서 인용 근거 없음" in r),
            "문서 인용 근거 없음",
        )
        if not clean_answer.strip():
            clean_answer = _fallback_briefing_from_sources(state)
        answer = clean_answer
        docs_strip_logs.append(
            make_node_event(
                "validator",
                status="failed",
                detail="문서 환각 문장 제거 — 채팅 제외, tool stream에만 기록",
                attempt=pass_n,
                params={
                    "pass": pass_n,
                    "ratio": round(ratio, 3),
                    "stripped_docs_hallucination": 1,
                },
                error={
                    "code": "DOCS_HALLUCINATION",
                    "message": docs_notes,
                },
                result={
                    "type": "list",
                    "items": [
                        {
                            "title": "제외된 문서 인용 (근거 없음)",
                            "preview": flagged[:280]
                            + ("…" if len(flagged) > 280 else ""),
                            "meta": "chat_hidden",
                        }
                    ],
                },
                seq=51 + pass_n * 10,
            )
        )
        failure_reasons = [
            r for r in failure_reasons if "문서 인용 근거 없음" not in r
        ]

    ok = len(failure_reasons) == 0
    notes = ""
    if not ok:
        notes = " · ".join(failure_reasons)
        notes += " — 캘린더·문서·대화·Slack·Gmail JSON에 없는 고유명사/사실은 제거하세요."
    elif docs_notes:
        notes = docs_notes

    if ok:
        detail = f"{pass_n}차 검증 통과 (근거 일치)"
        if pass_n > 1:
            detail = f"{pass_n}차 검증 통과 — 자동 재검증됨"
        if docs_strip_logs:
            detail = (
                f"{pass_n}차 검증 — 문서 환각 문장 제거 후 통과 "
                "(본문은 채팅, 제외 문장은 tool stream)"
            )
        success_logs: list[dict[str, Any]] = [running, *docs_strip_logs]
        if not docs_strip_logs:
            success_logs.append(
                make_node_event(
                    "validator",
                    status="success",
                    detail=detail,
                    attempt=pass_n,
                    params={"pass": pass_n, "ratio": round(ratio, 3)},
                    result={
                        "type": "list",
                        "items": [
                            {
                                "title": "검증 통과",
                                "meta": f"{pass_n}차",
                                "preview": detail,
                            }
                        ],
                    },
                    seq=51 + pass_n * 10,
                )
            )
        else:
            success_logs.append(
                make_node_event(
                    "validator",
                    status="success",
                    detail=detail,
                    attempt=pass_n,
                    params={
                        "pass": pass_n,
                        "ratio": round(ratio, 3),
                        "stripped_docs_hallucination": 1,
                    },
                    result={
                        "type": "list",
                        "items": [
                            {
                                "title": "검증 통과 (문서 환각 제외)",
                                "meta": f"{pass_n}차",
                                "preview": detail,
                            }
                        ],
                    },
                    seq=52 + pass_n * 10,
                )
            )
        return {
            "validation_ok": True,
            "validation_review_pending": False,
            "validation_notes": notes if docs_strip_logs else "",
            "pending_review": None,
            "answer": answer,
            "tool_logs": success_logs,
            "trace": [
                _trace(
                    "validator",
                    ok=True,
                    ratio=round(ratio, 3),
                    retries=retries,
                    stripped_docs=bool(docs_strip_logs),
                )
            ],
        }

    validator_mode = (state.get("validator_mode") or "auto").strip().lower()
    if validator_mode == "review":
        clean_answer, pending = build_pending_review_payload(answer, failure_reasons)
        review_detail = (
            f"검증 이슈 — 사용자 검토 대기 ({failure_reasons[0]})"
        )
        return {
            "validation_ok": True,
            "validation_review_pending": True,
            "validation_notes": notes,
            "pending_review": pending,
            "answer": clean_answer,
            "tool_logs": [
                running,
                *docs_strip_logs,
                make_node_event(
                    "validator",
                    status="success",
                    detail=review_detail,
                    attempt=pass_n,
                    params={
                        "pass": pass_n,
                        "ratio": round(ratio, 3),
                        "review": 1,
                    },
                    result={
                        "type": "list",
                        "items": [
                            {
                                "title": "검토 필요",
                                "preview": pending.get("content", "")[:160],
                                "meta": pending.get("reason", ""),
                            }
                        ],
                    },
                    seq=51 + pass_n * 10,
                ),
            ],
            "trace": [
                _trace(
                    "validator",
                    ok=True,
                    review=True,
                    ratio=round(ratio, 3),
                    retries=retries,
                )
            ],
        }

    if max_retries_hit:
        # 오류 스텁은 강제 승인하지 않고 폴백 초안으로 교체
        if _is_synth_error_answer(answer):
            answer = _fallback_briefing_from_sources(state)
        forced_detail = (
            "부분 검증 실패, 안전한 항목만 반영 "
            f"(재시도 한도 도달 · {failure_reasons[0]})"
        )
        return {
            "validation_ok": True,
            "validation_review_pending": False,
            "validation_notes": notes,
            "answer": answer,
            "tool_logs": [
                running,
                *docs_strip_logs,
                make_node_event(
                    "validator",
                    status="success",
                    detail=forced_detail,
                    attempt=pass_n,
                    params={"pass": pass_n, "forced": 1, "ratio": round(ratio, 3)},
                    result={
                        "type": "list",
                        "items": [
                            {
                                "title": "최종 승인 (경고 포함)",
                                "preview": forced_detail,
                            }
                        ],
                    },
                    seq=51 + pass_n * 10,
                ),
            ],
            "trace": [
                _trace(
                    "validator",
                    ok=True,
                    forced=True,
                    ratio=round(ratio, 3),
                    retries=retries,
                )
            ],
        }

    fail_detail = (
        f"검증 실패: {failure_reasons[0]} → synthesizer 재호출"
    )
    return {
        "validation_ok": False,
        "validation_notes": notes,
        "answer": answer,
        "tool_logs": [
            running,
            *docs_strip_logs,
            make_node_event(
                "validator",
                status="failed",
                detail=fail_detail,
                attempt=pass_n,
                params={"pass": pass_n, "ratio": round(ratio, 3)},
                error={"code": "VALIDATION_FAILED", "message": fail_detail},
                seq=51 + pass_n * 10,
            ),
        ],
        "trace": [
            _trace("validator", ok=False, ratio=round(ratio, 3), retries=retries)
        ],
    }
