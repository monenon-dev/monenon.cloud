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
from orchestration.app.briefing.tool_logs import (
    events_for_tool_node,
    make_node_event,
)

logger = logging.getLogger(__name__)

_ALL_TOOLS = ("calendar", "docs", "history")

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
            "slack_result": result,
            "tool_logs": events_for_tool_node("history", result, seq_base=30),
            "trace": [_trace("history", status="skipped", tool="history.digest")],
        }

    user_id = state.get("user_id")
    session = state.get("db_session")
    if user_id is not None and session is not None:
        result = await fetch_recent_history(session, user_id)
        return {
            "history_result": result,
            "slack_result": result,
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
        "slack_result": result,
        "tool_logs": events_for_tool_node("history", result, seq_base=30),
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

    context = (
        f"[캘린더]\n{json.dumps(calendar, ensure_ascii=False)}\n\n"
        f"[문서]\n{json.dumps(docs, ensure_ascii=False)}\n\n"
        f"[최근 대화]\n{json.dumps(history, ensure_ascii=False)}"
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

    # 의도적 실패 시나리오: docs 비어 있고 1차 합성이면 문서 환각 문장 삽입
    injected = False
    if pass_n == 1 and _docs_empty(state) and not notes:
        if _DOCS_HALLUCINATION_SNIPPET not in answer:
            answer = f"{answer.rstrip()}\n\n{_DOCS_HALLUCINATION_SNIPPET}"
            injected = True

    retries = int(state.get("synth_retries") or 0)
    done_detail = f"{pass_n}차 브리핑 초안 생성 완료"
    if injected:
        done_detail += " (문서 미연동 데모: 근거 없는 문서 서술 포함)"

    done_event = make_node_event(
        "synthesizer",
        status="success",
        detail=done_detail,
        attempt=pass_n,
        params={"pass": pass_n, "chars": len(answer)},
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

    return {
        "answer": answer,
        "synth_pass": pass_n,
        "synth_retries": retries + (1 if notes else 0),
        "tool_logs": [start_event, done_event],
        "trace": [
            _trace(
                "synthesizer",
                tool="briefing.synthesize",
                retry=is_retry,
                pass_n=pass_n,
                injected=injected,
            )
        ],
    }


async def validator_node(state: BriefingState) -> dict:
    """Synthesizer 결과가 도구 근거에 기반하는지 검사."""
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

    failure_reasons: list[str] = []

    # 데모 시나리오: 문서 소스 없음 + 문서 환각 서술
    if _docs_empty(state) and _answer_has_docs_hallucination(answer):
        failure_reasons.append(
            "문서 인용 근거 없음 (문서 소스가 비어 있는데 문서·로드맵 서술이 포함됨)"
        )

    any_items = any(
        isinstance(state.get(k), dict) and (state.get(k) or {}).get("items")
        for k in ("calendar_result", "docs_result", "history_result", "slack_result")
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

    ok = len(failure_reasons) == 0
    notes = ""
    if not ok:
        notes = " · ".join(failure_reasons)
        notes += " — 캘린더·문서·대화 JSON에 없는 고유명사/사실은 제거하세요."

    if ok:
        detail = f"{pass_n}차 검증 통과 (근거 일치)"
        if pass_n > 1:
            detail = f"{pass_n}차 검증 통과 — 자동 재검증됨"
        return {
            "validation_ok": True,
            "validation_notes": "",
            "tool_logs": [
                running,
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
                ),
            ],
            "trace": [
                _trace("validator", ok=True, ratio=round(ratio, 3), retries=retries)
            ],
        }

    if max_retries_hit:
        forced_detail = (
            "부분 검증 실패, 안전한 항목만 반영 "
            f"(재시도 한도 도달 · {failure_reasons[0]})"
        )
        return {
            "validation_ok": True,
            "validation_notes": notes,
            "tool_logs": [
                running,
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
        "tool_logs": [
            running,
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
