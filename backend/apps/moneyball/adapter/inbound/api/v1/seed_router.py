"""Moneyball K-League 더미 데이터 시드 API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from moneyball.app.use_cases.seed_k_league_interactor import (
    get_moneyball_overview,
    seed_k_league_dummy,
)

logger = logging.getLogger(__name__)

seed_router = APIRouter(prefix="/moneyball", tags=["moneyball"])


@seed_router.get("/overview")
async def moneyball_overview(session: AsyncSession = Depends(get_db)) -> dict:
    """moneyball_* 테이블 행 수."""
    counts = await get_moneyball_overview(session)
    return {"ok": True, "counts": counts}


@seed_router.post("/seed")
async def moneyball_seed(session: AsyncSession = Depends(get_db)) -> dict:
    """
    K-League 더미 데이터 적재.
    stadium → team → player → schedule 순으로 SQL 실행.
    """
    try:
        result = await seed_k_league_dummy(session, replace=True)
        await session.commit()
        logger.info("[moneyball] seed complete — %s", result["counts"])
        return result
    except Exception as exc:
        await session.rollback()
        logger.exception("[moneyball] seed failed")
        return {"ok": False, "detail": str(exc)}
