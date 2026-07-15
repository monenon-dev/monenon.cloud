"""Moneyball ↔ star_craft 허브 어댑터 — 스타 토폴로지 유지."""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from moneyball.app.ontology.moneyball_spokes import moneyball_spoke_nodes, spoke_id_from_node_name
from moneyball.app.ontology.star import HUB_ROUTE_PROMPT, SpokeId
from moneyball.app.services.chat_journey import ChatJourney
from star_craft.adapter.outbound.neo4j_graph_repository import Neo4jGraphRepository
from star_craft.adapter.outbound.pgvector_vector_repository import PgvectorVectorRepository
from star_craft.app.use_cases import ContextRoutingUseCase, hub_model_name
from star_craft.domain import SpokeNode

logger = logging.getLogger(__name__)

_MONEYBALL_ROUTE_PROMPT = (
    HUB_ROUTE_PROMPT
    + "\n스포크 이름은 moneyball.stadium | moneyball.team | moneyball.player | moneyball.schedule 입니다.\n"
    "후보:\n{spoke_list}\n"
)

_registered = False


def _routing_use_case(session: AsyncSession) -> ContextRoutingUseCase:
    return ContextRoutingUseCase(Neo4jGraphRepository(), PgvectorVectorRepository(session))


async def ensure_moneyball_spokes(session: AsyncSession, journey: ChatJourney) -> None:
    """star_craft Hub에 moneyball 스포크 등록 (최초 1회)."""
    global _registered
    if _registered:
        journey.log("star_craft.spokes", status="cached")
        return

    uc = _routing_use_case(session)
    try:
        await uc.ensure_hub()
        nodes = moneyball_spoke_nodes()
        for node in nodes:
            await uc.register_spoke(node)
        _registered = True
        journey.log(
            "star_craft.spokes",
            status="registered",
            spokes=[n.name for n in nodes],
        )
    except Exception as exc:
        logger.warning("[moneyball] star_craft spoke register failed: %s", exc)
        journey.log("star_craft.spokes", status="failed", error=str(exc))


async def hub_route_moneyball(
    session: AsyncSession,
    query: str,
    journey: ChatJourney,
) -> tuple[list[dict[str, str]], str, dict]:
    """
    star_craft 허브 3단계 라우팅 → moneyball 스포크 목록.
    returns (spokes[{id, subquery}], mode, meta)
    """
    await ensure_moneyball_spokes(session, journey)
    uc = _routing_use_case(session)
    catalog: list[SpokeNode] = moneyball_spoke_nodes()

    scored = await uc.vector_candidates(query, {n.name for n in catalog}, top_k=6)
    journey.log(
        "star_craft.vector",
        hits=[{"spoke": n, "score": s} for n, s in scored],
    )

    candidate_names = [c[0] for c in scored] or [n.name for n in catalog]
    valid = await uc.neo4j_validate(candidate_names, fallback=catalog)
    journey.log("star_craft.neo4j", valid=[s.name for s in valid])

    meta = await uc.route_multi(query, catalog, route_system_prompt=_MONEYBALL_ROUTE_PROMPT)
    journey.log(
        "star_craft.hub_route",
        hub_model=hub_model_name(),
        reason=meta.get("reason"),
        raw_spokes=meta.get("raw_spokes"),
    )

    parsed: list[dict[str, str]] = []
    for item in meta.get("raw_spokes") or []:
        node_name = str(item.get("id") or item.get("spoke") or "").strip()
        sid = spoke_id_from_node_name(node_name) or (
            node_name if node_name in ("stadium", "team", "player", "schedule") else None
        )
        if sid is None:
            continue
        subquery = str(item.get("subquery") or query).strip()
        parsed.append({"id": sid, "subquery": subquery})

    if parsed:
        return parsed, "star_craft-hub", meta
    return [], "star_craft-empty", meta


async def hub_synthesize_rag(
    session: AsyncSession,
    question: str,
    *,
    rag_chunks: list[str],
    sql_evidence: str,
    journey: ChatJourney,
    system_prompt: str,
) -> tuple[str, str]:
    uc = _routing_use_case(session)
    try:
        answer = await uc.synthesize_rag(
            question,
            rag_chunks=rag_chunks,
            sql_evidence=sql_evidence,
            system_prompt=system_prompt,
        )
        journey.log(
            "star_craft.hub_synth",
            hub_model=hub_model_name(),
            rag_count=len(rag_chunks),
            answer_len=len(answer),
        )
        if answer:
            return answer, "star_craft-rag"
    except Exception as exc:
        logger.warning("[moneyball] star_craft synth failed: %s", exc)
        journey.log("star_craft.hub_synth", status="failed", error=str(exc))
    return "", "star_craft-fallback"
