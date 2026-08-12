"""LangGraph 주간 업무 리포트 노드."""

from __future__ import annotations

import json
import logging
import re
from datetime import timedelta
from typing import Any

from core.matrix.vault_keymaker_secret_manager import get_keymaker
from gemini_caller import call_gemini
from orchestration.adapter.outbound.pg.daily_briefing_pg_repository import (
    DailyBriefingPgRepository,
)
from orchestration.app.agent_system_prompt import with_agent_system_prompt
from orchestration.app.use_cases.get_or_create_today_briefing import today_seoul
from orchestration.app.weekly_report.state import WeeklyReportState
from orchestration.app.weekly_report.tool_logs import list_result, make_node_event

logger = logging.getLogger(__name__)

_DELAY_KEYWORDS = ("지연", "미완료", "블로커", "blocker", "연기", "누락", "미해결", "pending")
_FOCUS_AREAS = ("progress", "risks", "actions", "highlights")


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


def _briefing_corpus(briefings: list[dict]) -> str:
    parts: list[str] = []
    for row in briefings:
        date = row.get("briefing_date") or row.get("date") or "?"
        content = (row.get("content") or "").strip()
        if content:
            parts.append(f"[{date}]\n{content}")
    return "\n\n".join(parts)


def _heuristic_risks(briefings: list[dict]) -> list[dict]:
    """일별 브리핑에서 반복 키워드·지연 패턴을 탐지."""
    risks: list[dict] = []
    keyword_days: dict[str, list[str]] = {}

    for row in briefings:
        date = str(row.get("briefing_date") or row.get("date") or "")
        content = (row.get("content") or "").lower()
        if not content:
            continue
        for kw in _DELAY_KEYWORDS:
            if kw.lower() in content:
                keyword_days.setdefault(kw, []).append(date)

    for kw, days in keyword_days.items():
        unique_days = sorted({d for d in days if d})
        if len(unique_days) >= 2:
            risks.append(
                {
                    "title": f"반복 이슈: '{kw}'",
                    "severity": "high" if len(unique_days) >= 3 else "medium",
                    "detail": f"최근 {len(unique_days)}일 브리핑에서 '{kw}' 관련 언급이 반복됩니다.",
                    "evidence_days": unique_days,
                }
            )

    if len(briefings) < 3:
        risks.append(
            {
                "title": "브리핑 데이터 부족",
                "severity": "low",
                "detail": (
                    f"최근 7일 중 {len(briefings)}일치 브리핑만 존재합니다. "
                    "패턴 분석 신뢰도가 낮을 수 있습니다."
                ),
                "evidence_days": [
                    str(r.get("briefing_date") or r.get("date") or "")
                    for r in briefings
                ],
            }
        )
    return risks


def _normalize_risks(raw: Any) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        title = item.get("title")
        if not isinstance(title, str) or not title.strip():
            continue
        severity = str(item.get("severity") or "medium").lower()
        if severity not in ("high", "medium", "low"):
            severity = "medium"
        detail = item.get("detail") if isinstance(item.get("detail"), str) else ""
        evidence = item.get("evidence_days")
        row: dict[str, Any] = {
            "title": title.strip(),
            "severity": severity,
            "detail": detail.strip(),
        }
        if isinstance(evidence, list):
            row["evidence_days"] = [str(d) for d in evidence if str(d).strip()]
        out.append(row)
    return out


def _normalize_actions(raw: Any) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        title = item.get("title")
        if not isinstance(title, str) or not title.strip():
            continue
        priority = str(item.get("priority") or "medium").lower()
        if priority not in ("high", "medium", "low"):
            priority = "medium"
        detail = item.get("detail") if isinstance(item.get("detail"), str) else ""
        out.append(
            {
                "title": title.strip(),
                "priority": priority,
                "detail": detail.strip(),
            }
        )
    return out


def _merge_risks(heuristic: list[dict], llm: list[dict]) -> list[dict]:
    seen: set[str] = set()
    merged: list[dict] = []
    for row in heuristic + llm:
        key = row.get("title", "").lower()
        if key in seen:
            continue
        seen.add(key)
        merged.append(row)
    return merged


async def weekly_router_node(state: WeeklyReportState) -> dict:
    running = make_node_event(
        "weekly_router",
        status="running",
        detail="주간 리포트 초점 영역 결정 중…",
        seq=1,
    )
    system = (
        "[역할] 주간 업무 리포트 라우터.\n"
        '형식: {"focus_areas":["progress","risks","actions","highlights"], "reason":"..."}\n'
        "focus_areas: progress(진행), risks(리스크), actions(다음 액션), highlights(하이라이트)"
    )
    user = "최근 7일 daily_briefings를 종합하는 주간 업무 리포트를 생성합니다."
    try:
        parsed = _call_agent_json(system, user)
        raw_areas = parsed.get("focus_areas")
        if isinstance(raw_areas, list):
            focus = [str(a).strip().lower() for a in raw_areas if str(a).strip().lower() in _FOCUS_AREAS]
        else:
            focus = list(_FOCUS_AREAS)
        reason = parsed.get("reason") if isinstance(parsed.get("reason"), str) else ""
    except Exception as exc:
        logger.warning("[weekly_router] fallback all areas: %s", exc)
        focus = list(_FOCUS_AREAS)
        reason = "기본 영역 전체"

    if not focus:
        focus = list(_FOCUS_AREAS)

    done = make_node_event(
        "weekly_router",
        status="success",
        detail=f"리포트 초점: {', '.join(focus)}" + (f" — {reason}" if reason else ""),
        params={"areas": len(focus)},
        result=list_result(
            [{"title": area, "meta": "focus"} for area in focus],
        ),
        seq=2,
    )
    return {
        "focus_areas": focus,
        "tool_logs": [running, done],
        "trace": [_trace("weekly_router", areas=focus)],
    }


async def aggregate_briefings_node(state: WeeklyReportState) -> dict:
    user_id = state.get("user_id")
    session = state.get("db_session")
    running = make_node_event(
        "aggregate_briefings",
        status="running",
        detail="최근 7일 daily_briefings 조회 중…",
        seq=10,
    )

    briefings: list[dict] = []
    if user_id and session is not None:
        repo = DailyBriefingPgRepository(session)
        rows = await repo.list_recent_for_user(int(user_id), days=7)
        briefings = [
            {
                "id": row.id,
                "briefing_date": row.briefing_date.isoformat(),
                "content": row.content,
                "tool_logs_count": len(row.tool_logs or []),
            }
            for row in rows
        ]

    end = today_seoul()
    start = end - timedelta(days=6)
    detail = (
        f"브리핑 {len(briefings)}건 수집 ({start.isoformat()} ~ {end.isoformat()})"
        if briefings
        else f"최근 7일 브리핑 없음 ({start.isoformat()} ~ {end.isoformat()})"
    )
    items = [
        {
            "title": row["briefing_date"],
            "meta": f"{row.get('tool_logs_count', 0)} logs",
            "preview": (row.get("content") or "")[:120]
            + ("…" if len(row.get("content") or "") > 120 else ""),
        }
        for row in briefings
    ]
    done = make_node_event(
        "aggregate_briefings",
        status="success",
        detail=detail,
        params={"count": len(briefings), "days": 7},
        result=list_result(items),
        seq=11,
    )
    aggregate_result = {
        "status": "success" if briefings else "empty",
        "count": len(briefings),
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "items": briefings,
    }
    return {
        "briefings": briefings,
        "aggregate_result": aggregate_result,
        "tool_logs": [running, done],
        "trace": [_trace("aggregate_briefings", count=len(briefings))],
    }


async def risk_analyzer_node(state: WeeklyReportState) -> dict:
    briefings = state.get("briefings") or []
    running = make_node_event(
        "risk_analyzer",
        status="running",
        detail="반복 이슈·지연 패턴 분석 중…",
        seq=20,
    )

    heuristic = _heuristic_risks(briefings)
    llm_risks: list[dict] = []
    corpus = _briefing_corpus(briefings)
    if corpus.strip():
        system = (
            "[역할] 주간 업무 리스크 분석가.\n"
            '형식: {"risks":[{"title":"...","severity":"high|medium|low",'
            '"detail":"...","evidence_days":["YYYY-MM-DD"]}]}\n'
            "일별 브리핑에 근거가 있는 반복 이슈·지연·블로커만 추출하세요."
        )
        try:
            parsed = _call_agent_json(system, f"일별 브리핑:\n\n{corpus[:12000]}")
            llm_risks = _normalize_risks(parsed.get("risks"))
        except Exception as exc:
            logger.warning("[risk_analyzer] llm fallback heuristic only: %s", exc)

    risks = _merge_risks(heuristic, llm_risks)
    detail = f"리스크 {len(risks)}건 탐지" if risks else "특이 리스크 패턴 없음"
    done = make_node_event(
        "risk_analyzer",
        status="success",
        detail=detail,
        params={"risks": len(risks)},
        result=list_result(
            [
                {
                    "title": r["title"],
                    "meta": r.get("severity", "medium"),
                    "preview": r.get("detail", ""),
                }
                for r in risks
            ]
        ),
        seq=21,
    )
    return {
        "risks": risks,
        "risk_result": {"status": "success", "count": len(risks), "items": risks},
        "tool_logs": [running, done],
        "trace": [_trace("risk_analyzer", count=len(risks))],
    }


async def next_action_recommender_node(state: WeeklyReportState) -> dict:
    briefings = state.get("briefings") or []
    risks = state.get("risks") or []
    running = make_node_event(
        "next_action_recommender",
        status="running",
        detail="다음 주 액션 아이템 추천 중…",
        seq=30,
    )

    next_actions: list[dict] = []
    corpus = _briefing_corpus(briefings)
    risks_text = json.dumps(risks, ensure_ascii=False) if risks else "[]"
    if corpus.strip() or risks:
        system = (
            "[역할] 주간 업무 다음 액션 추천.\n"
            '형식: {"next_actions":[{"title":"...","priority":"high|medium|low","detail":"..."}]}\n'
            "브리핑·리스크에 근거한 실행 가능한 액션 3~5개를 제안하세요."
        )
        user = f"브리핑:\n{corpus[:10000]}\n\n탐지된 리스크:\n{risks_text}"
        try:
            parsed = _call_agent_json(system, user)
            next_actions = _normalize_actions(parsed.get("next_actions"))
        except Exception as exc:
            logger.warning("[next_action_recommender] llm failed: %s", exc)

    if not next_actions and risks:
        for risk in risks[:3]:
            next_actions.append(
                {
                    "title": f"{risk.get('title', '리스크')} 대응",
                    "priority": risk.get("severity", "medium"),
                    "detail": risk.get("detail", ""),
                }
            )

    detail = f"다음 액션 {len(next_actions)}건 추천" if next_actions else "추천 액션 없음"
    done = make_node_event(
        "next_action_recommender",
        status="success",
        detail=detail,
        params={"actions": len(next_actions)},
        result=list_result(
            [
                {
                    "title": a["title"],
                    "meta": a.get("priority", "medium"),
                    "preview": a.get("detail", ""),
                }
                for a in next_actions
            ]
        ),
        seq=31,
    )
    return {
        "next_actions": next_actions,
        "actions_result": {"status": "success", "count": len(next_actions), "items": next_actions},
        "tool_logs": [running, done],
        "trace": [_trace("next_action_recommender", count=len(next_actions))],
    }


async def report_synthesizer_node(state: WeeklyReportState) -> dict:
    briefings = state.get("briefings") or []
    risks = state.get("risks") or []
    next_actions = state.get("next_actions") or []
    notes = (state.get("validation_notes") or "").strip()
    pass_n = int(state.get("synth_pass") or 0) + 1
    is_retry = bool(notes) or pass_n > 1

    start = make_node_event(
        "report_synthesizer",
        status="retrying" if is_retry else "running",
        detail=(
            f"{pass_n}차 시도 — 검증 피드백 반영해 재합성"
            if is_retry
            else f"{pass_n}차 시도 — 주간 리포트 본문 합성 중"
        ),
        attempt=pass_n,
        params={"pass": pass_n},
        seq=40 + pass_n * 10,
    )

    aggregate = state.get("aggregate_result") or {}
    period = f"{aggregate.get('period_start', '?')} ~ {aggregate.get('period_end', '?')}"
    context = json.dumps(
        {
            "period": period,
            "briefing_count": len(briefings),
            "risks": risks,
            "next_actions": next_actions,
            "focus_areas": state.get("focus_areas") or [],
        },
        ensure_ascii=False,
    )
    repair = ""
    if notes:
        repair = f"\n\n[검증 피드백]\n{notes}\n위 피드백을 반영해 요약만 수정하세요."

    user_prompt = (
        f"최근 7일({period}) daily_briefings를 종합한 주간 업무 리포트 요약을 작성하세요.\n"
        "마크다운 헤딩·불릿을 사용하고, 아래 JSON에 있는 사실만 근거로 작성하세요.\n"
        "섹션: ## 주간 하이라이트, ## 진행 현황, ## 주요 리스크, ## 다음 주 액션\n\n"
        f"{context}{repair}"
    )
    prompt = with_agent_system_prompt(
        user_prompt,
        speech_tone=state.get("speech_tone"),
        user_type=state.get("user_type"),
        industry=state.get("industry"),
    )
    try:
        summary = call_gemini(prompt, model=get_keymaker().gemini_chat_model_id()).strip()
    except Exception as exc:
        logger.exception("[report_synthesizer] gemini failed: %s", exc)
        summary = "주간 리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."

    retries = int(state.get("synth_retries") or 0)
    done = make_node_event(
        "report_synthesizer",
        status="success",
        detail=f"{pass_n}차 주간 리포트 초안 생성 완료",
        attempt=pass_n,
        params={"pass": pass_n, "chars": len(summary)},
        result={
            "type": "draft",
            "items": [
                {
                    "title": f"주간 리포트 · {pass_n}차",
                    "preview": summary[:160] + ("…" if len(summary) > 160 else ""),
                }
            ],
        },
        seq=41 + pass_n * 10,
    )
    return {
        "summary": summary,
        "synth_pass": pass_n,
        "synth_retries": retries + (1 if notes else 0),
        "tool_logs": [start, done],
        "trace": [_trace("report_synthesizer", pass_n=pass_n, chars=len(summary))],
    }


async def validator_node(state: WeeklyReportState) -> dict:
    summary = (state.get("summary") or "").strip()
    briefings = state.get("briefings") or []
    risks = state.get("risks") or []
    next_actions = state.get("next_actions") or []
    pass_n = max(1, int(state.get("synth_pass") or 1))
    retries = int(state.get("synth_retries") or 0)
    max_retries_hit = retries >= 1

    running = make_node_event(
        "validator",
        status="running",
        detail=f"{pass_n}차 리포트 검증 중…",
        attempt=pass_n,
        params={"pass": pass_n},
        seq=50 + pass_n * 10,
    )

    failure_reasons: list[str] = []
    if not summary:
        failure_reasons.append("리포트 요약 본문이 비어 있습니다")
    if "오류가 발생했습니다" in summary:
        failure_reasons.append("합성 단계 오류 메시지가 포함됨")
    if not briefings:
        failure_reasons.append("집계된 daily_briefings가 없음 (데이터 부족 경고)")

    corpus = _briefing_corpus(briefings).lower()
    if briefings and corpus:
        tokens = [t for t in re.findall(r"[가-힣A-Za-z0-9]{2,}", summary) if len(t) >= 2]
        hits = sum(1 for t in tokens if t.lower() in corpus)
        ratio = hits / max(len(tokens), 1)
        if ratio < 0.05 and len(briefings) >= 2:
            failure_reasons.append(f"브리핑 근거와 겹침 부족 (ratio={ratio:.2f})")
    else:
        ratio = 0.0

    ok = len([r for r in failure_reasons if "데이터 부족" not in r]) == 0

    if ok:
        detail = f"{pass_n}차 검증 통과"
        if pass_n > 1:
            detail += " — 자동 재검증됨"
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
                    params={"pass": pass_n, "risks": len(risks), "actions": len(next_actions)},
                    result=list_result(
                        [{"title": "검증 통과", "meta": f"{pass_n}차", "preview": detail}]
                    ),
                    seq=51 + pass_n * 10,
                ),
            ],
            "trace": [_trace("validator", ok=True, pass_n=pass_n)],
        }

    notes = " · ".join(failure_reasons)
    if max_retries_hit:
        forced = f"부분 검증 실패, 현재 초안 승인 (재시도 한도 도달 · {failure_reasons[0]})"
        return {
            "validation_ok": True,
            "validation_notes": notes,
            "tool_logs": [
                running,
                make_node_event(
                    "validator",
                    status="success",
                    detail=forced,
                    attempt=pass_n,
                    params={"pass": pass_n, "forced": 1},
                    result=list_result(
                        [{"title": "최종 승인 (경고 포함)", "preview": forced}]
                    ),
                    seq=51 + pass_n * 10,
                ),
            ],
            "trace": [_trace("validator", ok=True, forced=True)],
        }

    fail_detail = f"검증 실패: {failure_reasons[0]} → report_synthesizer 재호출"
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
                params={"pass": pass_n},
                error={"code": "VALIDATION_FAILED", "message": fail_detail},
                seq=51 + pass_n * 10,
            ),
        ],
        "trace": [_trace("validator", ok=False, reason=failure_reasons[0])],
    }
