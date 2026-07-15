"""스타 토폴로지 채팅 오케스트레이터: Hub(7B) → Spoke(2B) → DB → Hub."""

from __future__ import annotations

import logging
import re
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from moneyball.app.ontology.star import (
    HUB_ROUTE_PROMPT,
    HUB_SYNTH_PROMPT,
    SPOKE_IDS,
    SPOKE_SCHEMA,
    SPOKE_SQL_PROMPT,
    SPOKE_TABLES,
    SpokeId,
)
from moneyball.app.services.heuristic import (
    heuristic_answer,
    heuristic_route,
    heuristic_sql,
)
from moneyball.app.services.llm_exaone import (
    chat_exaone,
    extract_json_object,
    fast_path_enabled,
    get_hub_model,
    get_spoke_model,
    llm_enabled,
)
from moneyball.app.services.sql_guard import UnsafeSqlError, validate_select_sql

logger = logging.getLogger(__name__)

_MAX_ROWS = 30
_PREVIEW_ROWS = 12


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


async def _hub_route(message: str) -> tuple[list[dict[str, str]], str]:
    """returns (spokes, mode_tag)."""
    if not llm_enabled() or fast_path_enabled():
        return heuristic_route(message), "heuristic"

    try:
        raw = chat_exaone(
            [
                {"role": "system", "content": HUB_ROUTE_PROMPT},
                {"role": "user", "content": message},
            ],
            model=get_hub_model(),
            num_predict=128,
        )
        data = extract_json_object(raw)
        spokes_raw = data.get("spokes") or []
        parsed: list[dict[str, str]] = []
        for item in spokes_raw:
            sid = str(item.get("id", "")).strip().lower()
            if sid not in SPOKE_IDS:
                continue
            subquery = str(item.get("subquery") or message).strip()
            parsed.append({"id": sid, "subquery": subquery})
        if not parsed:
            return heuristic_route(message), "hub-fallback"
        return parsed, "ollama-hub"
    except Exception as exc:
        logger.warning("[moneyball] hub route failed: %s", exc)
        return heuristic_route(message), "hub-fallback"


async def _spoke_sql(spoke: SpokeId, subquery: str) -> tuple[str, str]:
    if not llm_enabled() or fast_path_enabled():
        return heuristic_sql(spoke, subquery), "heuristic"

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
        return _ensure_limit(sql), "ollama-spoke"
    except Exception as exc:
        logger.warning("[moneyball] spoke %s sql failed: %s", spoke, exc)
        return heuristic_sql(spoke, subquery), "spoke-fallback"


async def _execute_sql(session: AsyncSession, sql: str) -> list[dict[str, Any]]:
    result = await session.execute(text(sql))
    return _row_dicts(list(result.fetchmany(_MAX_ROWS)))


async def _hub_synthesize(question: str, steps: list[dict[str, Any]]) -> tuple[str, str]:
    evidence_parts: list[str] = []
    for step in steps:
        # 프롬프트 축소: SQL·전체 덤프 대신 행만
        evidence_parts.append(
            f"[{step.get('spoke')}] n={step.get('row_count')} "
            f"err={step.get('error')} rows={step.get('rows_preview')}"
        )
    evidence = "\n".join(evidence_parts)

    if not llm_enabled():
        return heuristic_answer(question, steps), "heuristic"

    try:
        # 빠른 경로: 이미 GPU에 올라간 2.4B로 합성
        model = get_spoke_model() if fast_path_enabled() else get_hub_model()
        prompt = (
            HUB_SYNTH_PROMPT.format(question=question, evidence=evidence)
            + "\n답은 한국어 2~4문장. 표·코드 금지."
        )
        answer = chat_exaone(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": question},
            ],
            model=model,
            temperature=0.2,
            num_predict=160,
        )
        if not answer.strip():
            return heuristic_answer(question, steps), "hub-fallback"
        return answer.strip(), "ollama-hub"
    except Exception as exc:
        logger.warning("[moneyball] hub synth failed: %s", exc)
        return heuristic_answer(question, steps), "hub-fallback"


async def run_star_chat(session: AsyncSession, message: str) -> dict[str, Any]:
    question = message.strip()
    if not question:
        return {
            "ok": False,
            "reply": "질문을 입력해 주세요.",
            "detail": "empty message",
            "hub_model": get_hub_model(),
            "spoke_model": get_spoke_model(),
            "route": [],
            "steps": [],
            "mode": "none",
        }

    route, route_mode = await _hub_route(question)
    steps: list[dict[str, Any]] = []
    modes = {route_mode}

    for item in route:
        spoke = item["id"]  # type: ignore[assignment]
        spoke_id: SpokeId = spoke  # validated
        subquery = item["subquery"]
        sql, sql_mode = await _spoke_sql(spoke_id, subquery)
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
        except (UnsafeSqlError, Exception) as exc:
            logger.exception("[moneyball] sql exec failed spoke=%s", spoke_id)
            step["error"] = str(exc)

        steps.append(step)

    reply, synth_mode = await _hub_synthesize(question, steps)
    modes.add(synth_mode)

    # mode 요약: ollama가 하나라도 있으면 mixed/ollama
    if any(m.startswith("ollama") for m in modes):
        mode = "ollama" if all(m.startswith("ollama") for m in modes) else "mixed"
    else:
        mode = "heuristic"

    return {
        "ok": True,
        "reply": reply,
        "hub_model": get_hub_model(),
        "spoke_model": get_spoke_model(),
        "route": [s["spoke"] for s in steps],
        "steps": steps,
        "mode": mode,
    }
