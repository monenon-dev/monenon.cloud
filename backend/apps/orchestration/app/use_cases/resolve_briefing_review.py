"""브리핑 pending_review 사용자 결정 처리."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Literal
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.pg.daily_briefing_pg_repository import (
    DailyBriefingPgRepository,
)
from orchestration.app.briefing.validator_review import normalize_pending_review
from orchestration.app.use_cases.get_or_create_today_briefing import _row_to_payload

logger = logging.getLogger(__name__)
SEOUL = ZoneInfo("Asia/Seoul")

ReviewDecision = Literal["include", "exclude"]


def _review_tool_log(decision: ReviewDecision) -> dict[str, Any]:
    label = "포함" if decision == "include" else "제외"
    now = datetime.now(SEOUL)
    return {
        "id": f"review-{int(now.timestamp() * 1000)}",
        "timestamp": now.strftime("%H:%M:%S"),
        "toolName": "briefing.validate",
        "node": "validator",
        "status": "success",
        "params": {"decision": decision},
        "detail": f"사용자가 검토 후 {label} 결정",
        "result": {
            "type": "list",
            "items": [
                {
                    "title": f"사용자 검토 · {label}",
                    "preview": f"검토 대기 문장을 {label}했습니다.",
                }
            ],
        },
    }


async def resolve_briefing_review(
    session: AsyncSession,
    *,
    briefing_id: int,
    user_id: int,
    decision: ReviewDecision,
) -> dict[str, Any]:
    repo = DailyBriefingPgRepository(session)
    row = await repo.get_owned(briefing_id, user_id)
    if row is None:
        raise ValueError("브리핑을 찾을 수 없습니다.")

    pending = normalize_pending_review(row.pending_review)
    if pending is None:
        raise ValueError("검토 대기 항목이 없습니다.")

    content = (row.content or "").strip()
    flagged = (pending.get("content") or "").strip()
    if decision == "include" and flagged:
        if content:
            content = f"{content}\n\n{flagged}".strip()
        else:
            content = flagged

    logs = row.tool_logs if isinstance(row.tool_logs, list) else []
    logs = [*logs, _review_tool_log(decision)]

    updated = await repo.resolve_review(
        briefing_id,
        user_id=user_id,
        decision=decision,
        tool_logs=logs,
        content=content,
    )
    if updated is None:
        raise RuntimeError("브리핑 검토 결과를 저장하지 못했습니다.")

    await session.commit()
    return _row_to_payload(updated, created=False)
