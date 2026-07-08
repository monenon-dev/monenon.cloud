from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


from titanic.adapter.inbound.api.schemas.crew_smith_captain_schema import (
    ChatSchema,
    SmithChatResponseSchema,
)
from titanic.app.dto.crew_smith_captain_dto import SmithCaptainQuery, SmithCaptainResponse


class SmithCaptainRepository(ABC):
    @abstractmethod
    async def introduce_myself(self, query: SmithCaptainQuery) -> SmithCaptainResponse:
        pass

    @abstractmethod
    async def get_stats(self) -> dict[str, Any]:
        pass

    @abstractmethod
    async def chat(self, schema: ChatSchema) -> SmithChatResponseSchema:
        pass
