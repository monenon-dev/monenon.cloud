from __future__ import annotations

from typing import Any

import logging

from titanic.app.ports.output.crew_smith_captain_port import SmithCaptainPort

logger = logging.getLogger(__name__)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from titanic.app.dtos.crew_smith_captain_dto import SmithCaptainQuery, SmithCaptainResponse, ChatResponse
from titanic.adapter.outbound.orm.passenger_jack_trainer_orm import JackTrainerOrm as PersonOrm


class SmithCaptainRepository(SmithCaptainPort):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: SmithCaptainQuery) -> SmithCaptainResponse:
        
        '''앤드류 설계자의 자기 소개 레포지토리 구현 메소드'''

        logger.info(f"[SmithCaptainRepository] introduce_myself 진입 | request_data={query}")
        
        response: SmithCaptainResponse = SmithCaptainResponse(
            id= query.id * 10000,
            name= query.name + "가 레포지토리에 다녀옴"
        )
        return response

    async def chat(self, message: str) -> ChatResponse:
        logger.info(f"[SmithCaptainRepository] chat 진입 | message={message}")
        return ChatResponse(text=message)
    


    