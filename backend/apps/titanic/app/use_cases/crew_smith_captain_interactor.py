from __future__ import annotations

import logging
import re

from titanic.adapter.inbound.api.schemas.crew_smith_captain_schema import (
    ChatSchema,
    SmithCaptainSchema,
    SmithChatResponseSchema,
)
from titanic.app.dto.crew_smith_captain_dto import SmithCaptainQuery, SmithCaptainResponse
from titanic.app.ports.input.crew_smith_captain_use_case import SmithCaptainUseCase
from titanic.app.ports.input.passenger_jack_trainer_use_case import JackTrainerUseCase
from titanic.app.ports.input.passenger_rose_model_use_case import RoseModelUseCase
from titanic.app.ports.output.crew_smith_captain_repository import SmithCaptainRepository

_JACK_CHAT_PATTERN = re.compile(r"(예측|생존.?율|모델|잭|jack|train|학습)", re.IGNORECASE)
_ROSE_CHAT_PATTERN = re.compile(r"(로즈|rose|분석|승객.?데이터)", re.IGNORECASE)

logger = logging.getLogger(__name__)


class SmithCaptainInteractor(SmithCaptainUseCase):
    def __init__(
        self,
        repository: SmithCaptainRepository,
        jack: JackTrainerUseCase,
        rose: RoseModelUseCase,
    ) -> None:
        self.repository = repository
        self.jack = jack
        self.rose = rose

    async def introduce_myself(self, schema: SmithCaptainSchema) -> SmithCaptainResponse:
        return await self.repository.introduce_myself(
            SmithCaptainQuery(id=schema.id, name=schema.name)
        )

    async def get_stats(self) -> dict:
        return await self.repository.get_stats()

    async def chat(self, schema: ChatSchema) -> SmithChatResponseSchema:
        logger.info(
            "[SmithCaptainInteractor.chat] messages=%s",
            [{"role": turn.role, "text": turn.text} for turn in schema.messages],
        )
        message = schema.latest_user_message()
        if _JACK_CHAT_PATTERN.search(message):
            return await self._reply_via_jack(message)
        if _ROSE_CHAT_PATTERN.search(message):
            return await self._reply_via_rose(message)
        return await self.repository.chat(schema)

    async def _reply_via_jack(self, message: str) -> SmithChatResponseSchema:
        preprocessed = await self.jack.preprocess_message(message)
        training_rows = await self.jack.training_row_count()
        nouns = preprocessed.get("nouns", [])
        noun_hint = f" 핵심 명사: {', '.join(nouns)}." if nouns else ""
        reply = (
            f"잭 도슨 생존 예측 모델 관점입니다. 학습 데이터 {training_rows:,}건을 기준으로 "
            f"「{preprocessed.get('cleaned_text', message)}」에 대한 분석을 진행합니다."
            f"{noun_hint} "
            "Pclass·성별·나이·요금 등 피처로 생존 가능성을 추정할 수 있습니다."
        )
        return SmithChatResponseSchema(reply=reply, rejected=False)

    async def _reply_via_rose(self, message: str) -> SmithChatResponseSchema:
        analysis = await self.rose.analyze_rose_survival()
        count = analysis.get("count", 0)
        reply = (
            f"로즈 드윗 백 생존 분석 관점입니다. 승객 기록 {count:,}건을 바탕으로 "
            f"「{message}」에 답합니다. 1등석·성별·동반 가족 수가 생존 여부와 연관됩니다."
        )
        return SmithChatResponseSchema(reply=reply, rejected=False)
