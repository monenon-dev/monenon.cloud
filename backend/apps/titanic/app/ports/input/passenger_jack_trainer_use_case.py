from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from titanic.adapter.inbound.api.schemas.passenger_jack_trainer_schema import JackTrainerSchema
from titanic.app.dto.passenger_jack_trainer_dto import JackTrainerResponse


class JackTrainerUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: JackTrainerSchema) -> JackTrainerResponse:
        ...

    @abstractmethod
    async def preprocess_message(self, user_text: str) -> dict[str, Any]:
        """Kiwi(kiwipiepy) 한국어 전처리 — cleaned_text, nouns."""
        ...

    @abstractmethod
    async def analyze_message_intent(self, user_message: str) -> dict[str, Any]:
        """형태소 분석으로 keywords·intent 파악."""
        ...

    @abstractmethod
    async def get_model_info(self) -> dict[str, Any]:
        ...

    @abstractmethod
    async def analyze_jack_dawson(self) -> dict[str, Any]:
        ...

    @abstractmethod
    async def predict_survival(self, passenger_data: dict[str, Any]) -> dict[str, Any]:
        ...

    @abstractmethod
    async def training_row_count(self) -> int:
        """스미스 채팅에서 생존 예측 맥락 답변에 사용."""
        ...
