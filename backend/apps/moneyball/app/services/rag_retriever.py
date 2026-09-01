"""Moneyball RAG — pgvector 청크 인덱싱·검색."""

from __future__ import annotations

import logging

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from moneyball.adapter.outbound.orm.rag_chunk_orm import MoneyballRagChunkOrm
from moneyball.app.ontology.star import SpokeId

logger = logging.getLogger(__name__)


async def _embed(text_content: str) -> list[float]:
    from lol.ollama.faker_orchestrator import faker_orchestrator

    return await faker_orchestrator.embed(text_content)


async def clear_rag_index(session: AsyncSession) -> None:
    await session.execute(delete(MoneyballRagChunkOrm))
    await session.flush()


async def index_moneyball_rag(session: AsyncSession) -> dict[str, int]:
    """moneyball_* 행을 텍스트 청크로 임베딩·저장."""
    await clear_rag_index(session)
    counts: dict[str, int] = {"stadium": 0, "team": 0, "player": 0, "schedule": 0}

    stadium_rows = (
        await session.execute(
            text(
                "SELECT stadium_id, stadium_name, seat_count, address "
                "FROM moneyball_stadium ORDER BY stadium_id"
            )
        )
    ).fetchall()
    for row in stadium_rows:
        content = (
            f"[경기장] {row.stadium_name} | 좌석 {row.seat_count} | 주소 {row.address}"
        )
        emb = await _embed(content)
        session.add(
            MoneyballRagChunkOrm(
                spoke="stadium",
                doc_key=f"stadium:{row.stadium_id}",
                content=content,
                embedding=emb,
            )
        )
        counts["stadium"] += 1

    team_rows = (
        await session.execute(
            text(
                "SELECT t.team_id, t.region_name, t.team_name, s.stadium_name "
                "FROM moneyball_team t "
                "LEFT JOIN moneyball_stadium s ON s.stadium_id = t.stadium_id "
                "ORDER BY t.team_id"
            )
        )
    ).fetchall()
    for row in team_rows:
        content = (
            f"[팀] {row.team_name} ({row.region_name}) | 홈구장 {row.stadium_name or '미정'}"
        )
        emb = await _embed(content)
        session.add(
            MoneyballRagChunkOrm(
                spoke="team",
                doc_key=f"team:{row.team_id}",
                content=content,
                embedding=emb,
            )
        )
        counts["team"] += 1

    player_rows = (
        await session.execute(
            text(
                "SELECT p.player_id, p.player_name, p.position, p.back_no, "
                "p.nation, t.team_name "
                "FROM moneyball_player p "
                "JOIN moneyball_team t ON t.team_id = p.team_id "
                "ORDER BY p.player_id LIMIT 500"
            )
        )
    ).fetchall()
    for row in player_rows:
        content = (
            f"[선수] {row.player_name} | {row.team_name} | {row.position} "
            f"| 등번호 {row.back_no} | {row.nation}"
        )
        emb = await _embed(content)
        session.add(
            MoneyballRagChunkOrm(
                spoke="player",
                doc_key=f"player:{row.player_id}",
                content=content,
                embedding=emb,
            )
        )
        counts["player"] += 1

    schedule_rows = (
        await session.execute(
            text(
                "SELECT sc.sche_date, ht.team_name AS home, at.team_name AS away, "
                "sc.home_score, sc.away_score, st.stadium_name "
                "FROM moneyball_schedule sc "
                "JOIN moneyball_team ht ON ht.team_id = sc.hometeam_id "
                "JOIN moneyball_team at ON at.team_id = sc.awayteam_id "
                "LEFT JOIN moneyball_stadium st ON st.stadium_id = sc.stadium_id "
                "ORDER BY sc.sche_date DESC LIMIT 300"
            )
        )
    ).fetchall()
    for row in schedule_rows:
        content = (
            f"[경기] {row.sche_date} | {row.home} vs {row.away} "
            f"| {row.home_score}:{row.away_score} @ {row.stadium_name or '?'}"
        )
        emb = await _embed(content)
        key = f"schedule:{row.sche_date}:{row.home}:{row.away}"
        session.add(
            MoneyballRagChunkOrm(
                spoke="schedule",
                doc_key=key,
                content=content,
                embedding=emb,
            )
        )
        counts["schedule"] += 1

    await session.flush()
    logger.info("[moneyball/rag] indexed %s", counts)
    return counts


async def retrieve_rag_chunks(
    session: AsyncSession,
    query: str,
    *,
    top_k: int = 6,
    spoke_filter: SpokeId | None = None,
) -> list[dict]:
    """질문 임베딩으로 유사 청크 검색."""
    try:
        q_emb = await _embed(query)
    except Exception as exc:
        logger.warning("[moneyball/rag] embed failed: %s", exc)
        return []

    stmt = (
        select(
            MoneyballRagChunkOrm.spoke,
            MoneyballRagChunkOrm.content,
            MoneyballRagChunkOrm.doc_key,
            MoneyballRagChunkOrm.embedding.cosine_distance(q_emb).label("distance"),
        )
        .order_by("distance")
        .limit(top_k)
    )
    if spoke_filter:
        stmt = stmt.where(MoneyballRagChunkOrm.spoke == spoke_filter)

    rows = (await session.execute(stmt)).fetchall()
    return [
        {
            "spoke": r.spoke,
            "doc_key": r.doc_key,
            "content": r.content,
            "score": round(1.0 - float(r.distance), 4),
        }
        for r in rows
    ]
