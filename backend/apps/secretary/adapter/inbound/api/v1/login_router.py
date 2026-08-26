"""로그인 API — /auth/login, /auth/google."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Response

from auth import services as auth_services
from auth.router import jwks as auth_jwks
from auth.router import logout as auth_logout
from auth.router import refresh as auth_refresh
from auth.schemas import TokenResponse
from core.security import set_auth_cookies
from secretary.adapter.inbound.api.schemas.auth_request import (
    AuthCredentials,
    GoogleLoginBody,
    OAuthCodeBody,
)
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


async def _login_response(
    response: Response,
    user: User,
) -> LoginSuccessResponse:
    try:
        pair = await auth_services.issue_token_pair(user)
    except RuntimeError as e:
        logger.error("[LoginRouter] JWT 발급 실패 — %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from e
    set_auth_cookies(
        response,
        pair["access_token"],
        pair["refresh_token"],
        access_ttl_min=auth_services.ACCESS_TTL_MIN,
        refresh_ttl_days=auth_services.REFRESH_TTL_DAYS,
    )
    role = getattr(user.role, "value", user.role)
    return LoginSuccessResponse(
        access_token=pair["access_token"],
        token_type=pair["token_type"],
        refresh_token=pair["refresh_token"],
        expires_in=pair.get("expires_in"),
        user_id=user.id,
        nickname=user.nickname,
        role=str(role),
    )


@login_router.post("/login", response_model=LoginSuccessResponse)
async def auth_login(
    body: AuthCredentials,
    response: Response,
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
    return await _login_response(response, user)


@login_router.post("/google", response_model=LoginSuccessResponse)
async def auth_login_google(
    body: GoogleLoginBody,
    response: Response,
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
    return await _login_response(response, user)


@login_router.post("/naver", response_model=LoginSuccessResponse)
async def auth_login_naver(
    body: OAuthCodeBody,
    response: Response,
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
    return await _login_response(response, user)


@login_router.post("/kakao", response_model=LoginSuccessResponse)
async def auth_login_kakao(
    body: OAuthCodeBody,
    response: Response,
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
    return await _login_response(response, user)


login_router.add_api_route("/logout", auth_logout, methods=["POST"])
login_router.add_api_route("/refresh", auth_refresh, methods=["POST"], response_model=TokenResponse)
login_router.add_api_route("/.well-known/jwks.json", auth_jwks, methods=["GET"])
