"""star_craft 의존성 주입 — 포트 ↔ 어댑터 바인딩."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from star_craft.adapter.outbound.neo4j_graph_repository import Neo4jGraphRepository
from star_craft.adapter.outbound.pgvector_vector_repository import PgvectorVectorRepository
from star_craft.app.use_cases import ContextRoutingUseCase


def get_routing_use_case(session: AsyncSession = Depends(get_db)) -> ContextRoutingUseCase:
    return ContextRoutingUseCase(Neo4jGraphRepository(), PgvectorVectorRepository(session))
