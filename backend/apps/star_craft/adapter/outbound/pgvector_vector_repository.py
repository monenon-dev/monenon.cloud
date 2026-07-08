"""star_craft — pgvector VectorRepositoryPort 구현체."""

from __future__ import annotations

import logging

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Index, Integer, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import Base
from star_craft.app.ports.output import VectorRepositoryPort

logger = logging.getLogger(__name__)


class SpokeContext(Base):
    """스포크 컨텍스트 임베딩 테이블."""

    __tablename__ = "spoke_contexts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    spoke = Column(String(64), nullable=False, unique=True, index=True)
    description = Column(Text)
    embedding = Column(Vector(1024))


Index(
    "ix_spoke_contexts_embedding_cosine",
    SpokeContext.embedding,
    postgresql_using="ivfflat",
    postgresql_ops={"embedding": "vector_cosine_ops"},
    postgresql_with={"lists": 10},
)


class PgvectorVectorRepository(VectorRepositoryPort):

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upsert_spoke_context(
        self, spoke_name: str, description: str, embedding: list[float]
    ) -> None:
        result = await self._session.execute(
            select(SpokeContext).where(SpokeContext.spoke == spoke_name)
        )
        row = result.scalar_one_or_none()
        if row:
            row.description = description
            row.embedding = embedding
        else:
            row = SpokeContext(spoke=spoke_name, description=description, embedding=embedding)
            self._session.add(row)
        await self._session.flush()
        logger.info("[star_craft/pgvector] upsert: %s", spoke_name)

    async def search_similar_spokes(
        self, query_embedding: list[float], top_k: int = 3
    ) -> list[tuple[str, float]]:
        result = await self._session.execute(
            select(
                SpokeContext.spoke,
                SpokeContext.embedding.cosine_distance(query_embedding).label("distance"),
            )
            .order_by("distance")
            .limit(top_k)
        )
        return [(r.spoke, 1.0 - r.distance) for r in result.fetchall()]
