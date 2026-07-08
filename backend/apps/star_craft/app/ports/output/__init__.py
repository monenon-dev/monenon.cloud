"""star_craft 출력 포트 — Neo4j, pgvector 레포지토리 인터페이스."""

from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.domain import SpokeNode


class GraphRepositoryPort(ABC):

    @abstractmethod
    async def seed_hub(self) -> None: ...

    @abstractmethod
    async def register_spoke(self, spoke: SpokeNode) -> None: ...

    @abstractmethod
    async def get_active_spokes(self) -> list[SpokeNode]: ...

    @abstractmethod
    async def get_spoke_path(self, candidates: list[str]) -> list[SpokeNode]: ...

    @abstractmethod
    async def deactivate_spoke(self, name: str) -> None: ...


class VectorRepositoryPort(ABC):

    @abstractmethod
    async def upsert_spoke_context(
        self, spoke_name: str, description: str, embedding: list[float]
    ) -> None: ...

    @abstractmethod
    async def search_similar_spokes(
        self, query_embedding: list[float], top_k: int = 3
    ) -> list[tuple[str, float]]: ...
