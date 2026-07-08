import logging

from fastapi import APIRouter, Depends

from titanic.adapter.inbound.api.schemas.crew_smith_captain_schema import (
    ChatSchema,
    SmithCaptainSchema,
    SmithChatResponseSchema,
)
from titanic.app.dto.crew_smith_captain_dto import SmithCaptainResponse
from titanic.app.ports.input.crew_smith_captain_use_case import SmithCaptainUseCase
from titanic.app.dependencies.crew_smith_captain_provider import get_smith_captain_use_case

logger = logging.getLogger(__name__)

smith_captain_router = APIRouter(prefix="/titanic/smith", tags=["smith"])


@smith_captain_router.get("/myself")
async def introduce_myself(
    smith: SmithCaptainUseCase = Depends(get_smith_captain_use_case),
) -> SmithCaptainResponse:
    return await smith.introduce_myself(
        SmithCaptainSchema(
            id=7,
            name="스미스 선장 (Captain Edward John Smith)",
        )
    )


@smith_captain_router.get("/stats")
async def passenger_stats(
    smith: SmithCaptainUseCase = Depends(get_smith_captain_use_case),
) -> dict:
    return await smith.get_stats()


@smith_captain_router.post("/chat", response_model=SmithChatResponseSchema, summary="스미스 선장 채팅")
async def smith_chat(
    schema: ChatSchema,
    smith: SmithCaptainUseCase = Depends(get_smith_captain_use_case),
) -> SmithChatResponseSchema:
    logger.info(
        "[smith_chat] messages=%s",
        [{"role": turn.role, "text": turn.text} for turn in schema.messages],
    )
    response = await smith.chat(schema)
    logger.info(
        "[smith_chat] reply=%s rejected=%s",
        response.reply,
        response.rejected,
    )
    return response