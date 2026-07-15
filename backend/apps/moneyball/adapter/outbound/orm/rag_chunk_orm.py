"""Moneyball RAG 청크 pgvector 테이블."""

from __future__ import annotations

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Index, Integer, String, Text

from core.matrix.grid_oracle_database_manager import Base


class MoneyballRagChunkOrm(Base):
    """K리그 엔티티 텍스트 청크 — RAG 검색용."""

    __tablename__ = "moneyball_rag_chunks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    spoke = Column(String(32), nullable=False, index=True)
    doc_key = Column(String(128), nullable=False, unique=True, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1024))


Index(
    "ix_moneyball_rag_chunks_embedding_cosine",
    MoneyballRagChunkOrm.embedding,
    postgresql_using="ivfflat",
    postgresql_ops={"embedding": "vector_cosine_ops"},
    postgresql_with={"lists": 20},
)
