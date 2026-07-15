"""Moneyball K-League 더미 데이터 시드 — SQL 파일 순차 실행 + RAG 인덱스."""

from __future__ import annotations

import logging
import re
from pathlib import Path

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from moneyball.adapter.outbound.orm.player_orm import MoneyballPlayerOrm
from moneyball.adapter.outbound.orm.schedule_orm import MoneyballScheduleOrm
from moneyball.adapter.outbound.orm.stadium_orm import MoneyballStadiumOrm
from moneyball.adapter.outbound.orm.team_orm import MoneyballTeamOrm
from moneyball.app.services.rag_retriever import index_moneyball_rag
from moneyball.app.services.star_craft_hub import ensure_moneyball_spokes
from moneyball.app.services.chat_journey import ChatJourney

logger = logging.getLogger(__name__)

_SEED_SQL_DIR = Path(__file__).resolve().parent.parent.parent / "seed" / "sql"
_SQL_FILES = (
    "01_stadium.sql",
    "02_team.sql",
    "03_player.sql",
    "04_schedule.sql",
)


def _split_sql_statements(raw: str) -> list[str]:
    """세미콜론으로 문장 분리(문자열 내부 세미콜론은 이 데이터셋에 없음)."""
    parts = re.split(r";\s*\n?", raw.strip())
    return [p.strip() for p in parts if p.strip() and not p.strip().startswith("--")]


async def _clear_moneyball_tables(session: AsyncSession) -> None:
    """FK 순서: schedule → player → team → stadium."""
    await session.execute(delete(MoneyballScheduleOrm))
    await session.execute(delete(MoneyballPlayerOrm))
    await session.execute(delete(MoneyballTeamOrm))
    await session.execute(delete(MoneyballStadiumOrm))
    await session.flush()


async def get_moneyball_overview(session: AsyncSession) -> dict:
    stadium = int((await session.execute(select(func.count()).select_from(MoneyballStadiumOrm))).scalar_one())
    team = int((await session.execute(select(func.count()).select_from(MoneyballTeamOrm))).scalar_one())
    player = int((await session.execute(select(func.count()).select_from(MoneyballPlayerOrm))).scalar_one())
    schedule = int((await session.execute(select(func.count()).select_from(MoneyballScheduleOrm))).scalar_one())
    return {
        "stadium": stadium,
        "team": team,
        "player": player,
        "schedule": schedule,
        "total": stadium + team + player + schedule,
    }


async def seed_k_league_dummy(session: AsyncSession, *, replace: bool = True) -> dict:
    """
    seed/sql/*.sql 순서대로 더미 데이터 적재.
    replace=True면 기존 moneyball_* 행을 전부 삭제 후 재삽입.
    """
    if replace:
        await _clear_moneyball_tables(session)

    inserted_files: list[str] = []
    for filename in _SQL_FILES:
        path = _SEED_SQL_DIR / filename
        if not path.is_file():
            raise FileNotFoundError(f"시드 SQL 없음: {path}")
        raw = path.read_text(encoding="utf-8")
        statements = _split_sql_statements(raw)
        for stmt in statements:
            await session.execute(text(stmt))
        inserted_files.append(filename)
        logger.info("[moneyball] seed applied %s (%s statements)", filename, len(statements))

    overview = await get_moneyball_overview(session)
    rag_counts = await index_moneyball_rag(session)
    journey = ChatJourney("seed")
    await ensure_moneyball_spokes(session, journey)
    return {
        "ok": True,
        "files": inserted_files,
        "counts": overview,
        "rag_index": rag_counts,
        "star_craft_spokes": True,
    }
