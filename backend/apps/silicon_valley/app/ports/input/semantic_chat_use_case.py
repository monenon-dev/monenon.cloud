"""시맨틱 채팅 유스케이스 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod

from silicon_valley.app.dto.semantic_chat_dto import SemanticChatQuery, SemanticChatResult


class SemanticChatUseCase(ABC):
    @abstractmethod
    async def chat(self, query: SemanticChatQuery) -> SemanticChatResult:
        """전송 → 시맨틱 의도 → 해당 LangChain 엔진."""
