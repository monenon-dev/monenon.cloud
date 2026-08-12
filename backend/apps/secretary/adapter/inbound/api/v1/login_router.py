"""로그인 API — /auth/login, /auth/google."""

from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException

from secretary.adapter.inbound.api.schemas.auth_request import AuthCredentials, GoogleLoginBody, OAuthCodeBody
from secretary.adapter.inbound.api.schemas.auth_response import LoginSuccessResponse
from secretary.adapter.outbound.orm.user_model import User
from secretary.app.composition.providers import get_user_use_case
from secretary.app.ports.input.user_use_case import UserUseCasePort

logger = logging.getLogger(__name__)

try:
    from admin.app.constants import ADMIN_EMAIL
except ModuleNotFoundError:
    ADMIN_EMAIL = ""

login_router = APIRouter(prefix="/auth", tags=["user-login"])


def _login_response(user: User) -> LoginSuccessResponse:
    role = getattr(user.role, "value", user.role)
    return LoginSuccessResponse(
        access_token=secrets.token_urlsafe(48),
        user_id=user.id,
        nickname=user.nickname,
        role=str(role),
    )


@login_router.post("/login", response_model=LoginSuccessResponse)
async def auth_login(
    body: AuthCredentials,
    use_case: UserUseCasePort = Depends(get_user_use_case),
) -> LoginSuccessResponse:
    email = body.email.strip().lower()
    if email == ADMIN_EMAIL.lower():
        logger.warning("[LoginRouter] login 실패 — admin 계정 — email=%s", email)
        raise HTTPException(
            status_code=401,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    try:
        user = await use_case.authenticate(body.email, body.password)
    except ValueError as e:
        logger.warning("[LoginRouter] login 거부 — email=%s reason=%s", body.email, e)
        raise HTTPException(status_code=403, detail=str(e)) from e
    except RuntimeError as e:
        logger.error("[LoginRouter] login 설정 오류 — %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from e
    if not user:
        logger.warning("[LoginRouter] login 실패 — email=%s", body.email)
        raise HTTPException(
            status_code=401,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    logger.info("[LoginRouter] login 완료 — userId=%s", user.id)
    return _login_response(user)


@login_router.post("/google", response_model=LoginSuccessResponse)
async def auth_login_google(
    body: GoogleLoginBody,
    use_case: UserUseCasePort = Depends(get_user_use_case),
) -> LoginSuccessResponse:
    try:
        user = await use_case.authenticate_with_google(body.credential)
    except ValueError as e:
        logger.warning("[LoginRouter] login_google 실패 — %s", e)
        status = 403 if "일시정지" in str(e) else 401
        raise HTTPException(status_code=status, detail=str(e)) from e
    except RuntimeError as e:
        logger.error("[LoginRouter] login_google 설정 오류 — %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from e

    logger.info("[LoginRouter] login_google 완료 — userId=%s", user.id)
    return _login_response(user)


@login_router.post("/naver", response_model=LoginSuccessResponse)
async def auth_login_naver(
    body: OAuthCodeBody,
    use_case: UserUseCasePort = Depends(get_user_use_case),
) -> LoginSuccessResponse:
    try:
        user = await use_case.authenticate_with_naver(body.code, body.redirect_uri)
    except ValueError as e:
        logger.warning("[LoginRouter] login_naver 실패 — %s", e)
        status = 403 if "일시정지" in str(e) else 401
        raise HTTPException(status_code=status, detail=str(e)) from e
    except RuntimeError as e:
        logger.error("[LoginRouter] login_naver 설정 오류 — %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from e

    logger.info("[LoginRouter] login_naver 완료 — userId=%s", user.id)
    return _login_response(user)


@login_router.post("/kakao", response_model=LoginSuccessResponse)
async def auth_login_kakao(
    body: OAuthCodeBody,
    use_case: UserUseCasePort = Depends(get_user_use_case),
) -> LoginSuccessResponse:
    try:
        user = await use_case.authenticate_with_kakao(body.code, body.redirect_uri)
    except ValueError as e:
        logger.warning("[LoginRouter] login_kakao 실패 — %s", e)
        status = 403 if "일시정지" in str(e) else 401
        raise HTTPException(status_code=status, detail=str(e)) from e
    except RuntimeError as e:
        logger.error("[LoginRouter] login_kakao 설정 오류 — %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from e

    logger.info("[LoginRouter] login_kakao 완료 — userId=%s", user.id)
    return _login_response(user)
