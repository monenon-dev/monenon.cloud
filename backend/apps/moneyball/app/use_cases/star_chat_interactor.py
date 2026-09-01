"""스타 토폴로지 채팅: star_craft Hub(7.8B) → Moneyball Spoke → RAG+DB → Hub RAG 합성."""

from __future__ import annotations

import logging
import os
import re
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from moneyball.app.ontology.star import (
    HUB_SYNTH_PROMPT,
    SPOKE_SCHEMA,
    SPOKE_SQL_PROMPT,
    SPOKE_TABLES,
    SpokeId,
)
from moneyball.app.services.chat_journey import ChatJourney
from moneyball.app.services.heuristic import (
    heuristic_answer,
    heuristic_route,
    heuristic_sql,
)
from moneyball.app.services.llm_exaone import (
    chat_exaone,
    extract_json_object,
    fast_path_enabled,
    get_spoke_model,
    llm_enabled,
)
from moneyball.app.services.question_classifier import ExaoneQuestionClassifier
from moneyball.app.services.rag_retriever import retrieve_rag_chunks
from moneyball.app.services.sql_guard import UnsafeSqlError, validate_select_sql
from moneyball.app.services.star_craft_hub import hub_synthesize_rag
from star_craft.app.use_cases import hub_model_name

logger = logging.getLogger(__name__)

_MAX_ROWS = 30
_PREVIEW_ROWS = 12
_NO_EVIDENCE_REPLY = "DB에 해당 데이터가 없습니다."


def _rag_min_score() -> float:
    try:
        return float(os.getenv("MONEYBALL_RAG_MIN_SCORE", "0.35"))
    except ValueError:
        return 0.35


def _evidence_row_count(steps: list[dict[str, Any]]) -> int:
    return sum(int(s.get("row_count") or 0) for s in steps)


def _strong_rag_hits(rag_chunks: list[dict]) -> list[dict]:
    min_score = _rag_min_score()
    return [c for c in rag_chunks if float(c.get("score") or 0) >= min_score]


def _is_grounded(steps: list[dict[str, Any]], rag_chunks: list[dict]) -> bool:
    """하네스 판정: SQL 행이 있거나, 유사도 임계값 이상 RAG만 근거로 인정."""
    if _evidence_row_count(steps) > 0:
        return True
    return len(_strong_rag_hits(rag_chunks)) > 0


def _jsonable(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (bytes, memoryview)):
        return str(value)
    return value


def _row_dicts(rows: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        mapping = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
        out.append({k: _jsonable(v) for k, v in mapping.items()})
    return out


def _ensure_limit(sql: str) -> str:
    if re.search(r"\bLIMIT\s+\d+", sql, re.IGNORECASE):
        return sql
    return f"{sql.rstrip()} LIMIT {_MAX_ROWS}"


async def _hub_route(
    session: AsyncSession, message: str, journey: ChatJourney
) -> tuple[list[dict[str, str]], str]:
    """의사 분류기 포트로 스포크만 결정. 답변 생성은 하지 않는다."""
    classifier = ExaoneQuestionClassifier(session=session, journey=journey)
    result = await classifier.classify(message)
    route = result.as_route()
    if not route:
        route = heuristic_route(message)
        journey.log("classifier.empty_route", spokes=route)
        return route, "hub-fallback"
    journey.log(
        "classifier.route",
        mode=result.mode,
        intent=result.intent,
        entities=result.entities,
        spokes=route,
    )
    return route, result.mode


async def _spoke_sql(spoke: SpokeId, subquery: str, journey: ChatJourney) -> tuple[str, str]:
    if not llm_enabled() or fast_path_enabled():
        sql = heuristic_sql(spoke, subquery)
        journey.log("spoke.sql", spoke=spoke, mode="heuristic", sql=sql)
        return sql, "heuristic"

    try:
        prompt = SPOKE_SQL_PROMPT.format(
            schema=SPOKE_SCHEMA[spoke],
            subquery=subquery,
        )
        raw = chat_exaone(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": subquery},
            ],
            model=get_spoke_model(),
            num_predict=256,
        )
        data = extract_json_object(raw)
        sql = str(data.get("sql") or "").strip()
        sql = validate_select_sql(sql, allowed_tables=SPOKE_TABLES[spoke])
        sql = _ensure_limit(sql)
        journey.log("spoke.sql", spoke=spoke, mode="ollama-spoke", sql=sql)
        return sql, "ollama-spoke"
    except Exception as exc:
        logger.warning("[moneyball] spoke %s sql failed: %s", spoke, exc)
        sql = heuristic_sql(spoke, subquery)
        journey.log("spoke.sql", spoke=spoke, mode="spoke-fallback", sql=sql, error=str(exc))
        return sql, "spoke-fallback"


async def _execute_sql(session: AsyncSession, sql: str) -> list[dict[str, Any]]:
    result = await session.execute(text(sql))
    return _row_dicts(list(result.fetchmany(_MAX_ROWS)))


def _sql_evidence(steps: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for step in steps:
        parts.append(
            f"[{step.get('spoke')}] n={step.get('row_count')} "
            f"err={step.get('error')} rows={step.get('rows_preview')}"
        )
    return "\n".join(parts) if parts else "(없음)"


async def _hub_synthesize(
    session: AsyncSession,
    question: str,
    steps: list[dict[str, Any]],
    rag_chunks: list[dict],
    journey: ChatJourney,
) -> tuple[str, str]:
    rag_texts = [c["content"] for c in _strong_rag_hits(rag_chunks)]
    sql_evidence = _sql_evidence(steps)

    if not llm_enabled():
        answer = heuristic_answer(question, steps)
        journey.log("synth.heuristic", answer_len=len(answer))
        return answer, "heuristic"

    synth_prompt = (
        HUB_SYNTH_PROMPT.format(question=question, evidence=sql_evidence)
        + "\n[RAG 검색 결과]도 함께 참고하되, DB 조회와 충돌하면 DB를 우선하세요."
        + "\n답은 한국어 2~4문장. 표·코드 금지."
    )
    answer, mode = await hub_synthesize_rag(
        session,
        question,
        rag_chunks=rag_texts,
        sql_evidence=sql_evidence,
        journey=journey,
        system_prompt=synth_prompt,
    )
    if answer:
        return answer, mode

    try:
        answer = chat_exaone(
            [
                {"role": "system", "content": synth_prompt},
                {"role": "user", "content": question},
            ],
            model=hub_model_name(),
            temperature=0.2,
            num_predict=200,
        )
        if answer.strip():
            journey.log("synth.direct_hub", hub_model=hub_model_name())
            return answer.strip(), "ollama-hub"
    except Exception as exc:
        logger.warning("[moneyball] direct hub synth failed: %s", exc)
        journey.log("synth.failed", error=str(exc))

    fallback = heuristic_answer(question, steps)
    journey.log("synth.fallback", answer_len=len(fallback))
    return fallback, "hub-fallback"


async def run_star_chat(session: AsyncSession, message: str) -> dict[str, Any]:
    question = message.strip()
    journey = ChatJourney(question)
    journey.log("ingress", hub="star_craft", hub_model=hub_model_name())

    if not question:
        journey.log("response", ok=False, reason="empty")
        return {
            "ok": False,
            "reply": "질문을 입력해 주세요.",
            "detail": "empty message",
            "hub_model": hub_model_name(),
            "spoke_model": get_spoke_model(),
            "route": [],
            "steps": [],
            "journey": journey.to_list(),
            "mode": "none",
            "grounded": False,
            "evidence_row_count": 0,
        }

    rag_chunks = await retrieve_rag_chunks(session, question, top_k=6)
    journey.log("rag.retrieve", count=len(rag_chunks), chunks=rag_chunks)

    route, route_mode = await _hub_route(session, question, journey)
    steps: list[dict[str, Any]] = []
    modes = {route_mode}

    for item in route:
        spoke_id: SpokeId = item["id"]  # type: ignore[assignment]
        subquery = item["subquery"]
        sql, sql_mode = await _spoke_sql(spoke_id, subquery, journey)
        modes.add(sql_mode)
        step: dict[str, Any] = {
            "spoke": spoke_id,
            "subquery": subquery,
            "sql": sql,
            "row_count": 0,
            "rows_preview": [],
            "error": None,
            "sql_mode": sql_mode,
        }
        try:
            safe = validate_select_sql(sql, allowed_tables=SPOKE_TABLES[spoke_id])
            safe = _ensure_limit(safe)
            step["sql"] = safe
            rows = await _execute_sql(session, safe)
            step["row_count"] = len(rows)
            step["rows_preview"] = rows[:_PREVIEW_ROWS]
            journey.log(
                "spoke.execute",
                spoke=spoke_id,
                row_count=step["row_count"],
                sql=safe,
            )
        except (UnsafeSqlError, Exception) as exc:
            logger.exception("[moneyball] sql exec failed spoke=%s", spoke_id)
            step["error"] = str(exc)
            journey.log("spoke.execute", spoke=spoke_id, error=str(exc))

        steps.append(step)

    row_count = _evidence_row_count(steps)
    strong_rag = _strong_rag_hits(rag_chunks)
    grounded = _is_grounded(steps, rag_chunks)
    journey.log(
        "harness.grounding",
        grounded=grounded,
        evidence_row_count=row_count,
        strong_rag_count=len(strong_rag),
        rag_min_score=_rag_min_score(),
    )

    if not grounded:
        # 환각 차단: 근거 없으면 EXAONE 합성 호출 금지
        journey.log("synth.skipped_no_evidence", reply=_NO_EVIDENCE_REPLY)
        journey.log(
            "response",
            ok=True,
            mode="no_evidence",
            grounded=False,
            route=[s["spoke"] for s in steps],
        )
        return {
            "ok": True,
            "reply": _NO_EVIDENCE_REPLY,
            "hub_model": hub_model_name(),
            "spoke_model": get_spoke_model(),
            "route": [s["spoke"] for s in steps],
            "steps": steps,
            "journey": journey.to_list(),
            "mode": "no_evidence",
            "rag_hits": rag_chunks,
            "grounded": False,
            "evidence_row_count": row_count,
        }

    reply, synth_mode = await _hub_synthesize(
        session, question, steps, strong_rag, journey
    )
    modes.add(synth_mode)

    if "star_craft-rag" in modes or "ollama-hub" in modes:
        mode = "rag"
    elif all(m == "heuristic" for m in modes):
        mode = "heuristic"
    else:
        mode = "mixed"

    journey.log(
        "response",
        ok=True,
        mode=mode,
        grounded=True,
        route=[s["spoke"] for s in steps],
    )

    return {
        "ok": True,
        "reply": reply,
        "hub_model": hub_model_name(),
        "spoke_model": get_spoke_model(),
        "route": [s["spoke"] for s in steps],
        "steps": steps,
        "journey": journey.to_list(),
        "mode": mode,
        "rag_hits": rag_chunks,
        "grounded": True,
        "evidence_row_count": row_count,
    }
