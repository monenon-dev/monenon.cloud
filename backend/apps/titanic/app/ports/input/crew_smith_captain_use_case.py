from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from titanic.adapter.inbound.api.schemas.crew_smith_captain_schema import (
    ChatSchema,
    SmithCaptainSchema,
    SmithChatResponseSchema,
)
from titanic.app.dto.crew_smith_captain_dto import SmithCaptainResponse


class SmithCaptainUseCase(ABC):
    """
    스미스 선장 유스케이스.

    chat 은 스미스 전용 엔드포인트이며, 구현체 내부에서
    JackTrainerUseCase·RoseModelUseCase(생존 예측·승객 분석)를 호출한다.
    """

    @abstractmethod
    async def introduce_myself(self, schema: SmithCaptainSchema) -> SmithCaptainResponse:
        pass

    @abstractmethod
    async def get_stats(self) -> dict[str, Any]:
        pass

    @abstractmethod
    async def chat(self, schema: ChatSchema) -> SmithChatResponseSchema:
        """스미스 선장 채팅 — 잭·로즈 분석은 interactor 내부에서 위임."""
        pass
