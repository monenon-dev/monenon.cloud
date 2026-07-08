from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.vault_keymaker_secret_manager import get_keymaker
from gemini_caller import GeminiQuotaError, call_gemini
from titanic.adapter.inbound.api.schemas.crew_smith_captain_schema import (
    ChatSchema,
    SmithChatResponseSchema,
)
from titanic.adapter.outbound.orm.passenger_jack_trainer_orm import PassengerJackTrainerOrm as PersonOrm
from titanic.app.dto.crew_smith_captain_dto import SmithCaptainQuery, SmithCaptainResponse
from titanic.app.ports.output.crew_smith_captain_repository import SmithCaptainRepository
from titanic.app.smith_chat_prompt import (
    OFF_TOPIC_REPLY,
    build_smith_prompt,
    is_titanic_related,
    try_stats_answer,
)

logger = logging.getLogger(__name__)


class SmithCaptainPgRepository(SmithCaptainRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: SmithCaptainQuery) -> SmithCaptainResponse:
        logger.info("[SmithCaptainPgRepository] introduce_myself | request_data=%s", query)
        return SmithCaptainResponse(
            id=query.id * 10000,
            name=f"{query.name}가 레포지토리에 다녀옴",
        )

    async def get_stats(self) -> dict[str, Any]:
        total = (
            await self.session.execute(select(func.count()).select_from(PersonOrm))
        ).scalar_one()
        survived = (
            await self.session.execute(
                select(func.count()).where(PersonOrm.survived == "1")
            )
        ).scalar_one()
        return {"total": total, "survived": survived, "perished": total - survived}

    async def chat(self, schema: ChatSchema) -> SmithChatResponseSchema:
        message = schema.latest_user_message()
        history = schema.history_before_latest_user()
        if not is_titanic_related(message, history):
            return SmithChatResponseSchema(reply=OFF_TOPIC_REPLY, rejected=True)

        stats = await self.get_stats()
        stats_reply = try_stats_answer(message, stats)
        if stats_reply is not None:
            return SmithChatResponseSchema(reply=stats_reply, rejected=False)

        prompt = build_smith_prompt(message, history, stats)
        chat_model = get_keymaker().gemini_chat_model_id()

        try:
            reply = await asyncio.to_thread(call_gemini, prompt, model=chat_model)
        except GeminiQuotaError as exc:
            raise RuntimeError(str(exc)) from exc

        return SmithChatResponseSchema(reply=reply, rejected=False)
