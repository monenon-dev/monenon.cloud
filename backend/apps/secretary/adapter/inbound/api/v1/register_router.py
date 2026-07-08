"""회원가입 API — /auth/register."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from secretary.adapter.inbound.api.schemas.auth_request import RegisterBody
from secretary.adapter.inbound.api.schemas.auth_response import RegisterSuccessResponse
from secretary.app.composition.providers import get_user_use_case
from secretary.app.ports.input.user_use_case import UserUseCasePort

logger = logging.getLogger(__name__)

register_router = APIRouter(prefix="/auth", tags=["user-register"])


@register_router.post("/register", response_model=RegisterSuccessResponse, status_code=201)
async def auth_register(
    body: RegisterBody,
    use_case: UserUseCasePort = Depends(get_user_use_case),
) -> RegisterSuccessResponse:
    try:
        user = await use_case.register(
            body.nickname,
            body.email,
            body.password,
        )
    except ValueError as e:
        logger.warning("[RegisterRouter] register 실패 — %s", e)
        raise HTTPException(status_code=409, detail=str(e)) from e
    logger.info("[RegisterRouter] register 완료 — userId=%s", user.id)
    return RegisterSuccessResponse(
        message="회원가입이 완료되었습니다. 로그인해 주세요.",
        nickname=user.nickname,
        email=user.email,
    )
