"""auth 게이트웨이 라우터 — 발급·JWKS·logout."""

from __future__ import annotations

import logging
import os

import jwt
from fastapi import APIRouter, HTTPException, Request, Response

from auth import services
from auth.schemas import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse
from core.security import (
    ACCESS_COOKIE,
    COOKIE_KWARGS,
    REFRESH_COOKIE,
    public_jwk,
    verify_token,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth-gateway"])


def _set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    max_age_access = services.ACCESS_TTL_MIN * 60
    max_age_refresh = services.REFRESH_TTL_DAYS * 86400
    response.set_cookie(
        ACCESS_COOKIE,
        access,
        max_age=max_age_access,
        **COOKIE_KWARGS,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=max_age_refresh,
        path="/auth",
        **{k: v for k, v in COOKIE_KWARGS.items() if k != "path"},
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, domain=COOKIE_KWARGS.get("domain"), path="/")
    response.delete_cookie(
        REFRESH_COOKIE, domain=COOKIE_KWARGS.get("domain"), path="/auth"
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response) -> TokenResponse:
    try:
        pair = await services.login_with_password(body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    _set_auth_cookies(response, pair["access_token"], pair["refresh_token"])
    return TokenResponse(**pair)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    body: LogoutRequest | None = None,
) -> dict:
    refresh = (body.refresh_token if body else None) or request.cookies.get(
        REFRESH_COOKIE
    )
    access_jti = None
    bearer = request.headers.get("Authorization") or ""
    token = None
    if bearer.lower().startswith("bearer "):
        token = bearer[7:].strip()
    else:
        token = request.cookies.get(ACCESS_COOKIE)
    if token:
        try:
            aud = os.getenv("SERVICE_AUD", "monenon-api")
            access_jti = verify_token(token, aud=aud).jti
        except jwt.PyJWTError:
            access_jti = None
    await services.logout(refresh, access_jti)
    _clear_auth_cookies(response)
    return {"ok": True}


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
) -> TokenResponse:
    refresh_token = (body.refresh_token if body else None) or request.cookies.get(
        REFRESH_COOKIE
    )
    if not refresh_token:
        raise HTTPException(status_code=401, detail="refresh_token이 필요합니다.")
    try:
        pair = await services.refresh_tokens(refresh_token)
    except ValueError as e:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail=str(e)) from e
    except jwt.PyJWTError as e:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="유효하지 않은 refresh 토큰입니다.") from e
    _set_auth_cookies(response, pair["access_token"], pair["refresh_token"])
    return TokenResponse(**pair)


@router.get("/callback/{provider}")
async def oauth_callback(
    provider: str,
    request: Request,
    response: Response,
) -> TokenResponse:
    """OAuth authorization code → JWT. provider: google|kakao|naver"""
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="code가 없습니다.")
    redirect_uri = request.query_params.get("redirect_uri") or ""
    credential = request.query_params.get("credential")  # Google GIS

    try:
        if provider == "google":
            if credential:
                pair = await services.login_with_google_id_token(credential)
            elif code and redirect_uri:
                raise HTTPException(
                    status_code=400,
                    detail="Google은 credential(ID 토큰)을 사용해 주세요.",
                )
            else:
                raise HTTPException(status_code=400, detail="credential이 필요합니다.")
        elif provider == "kakao":
            if not redirect_uri:
                raise HTTPException(status_code=400, detail="redirect_uri가 필요합니다.")
            pair = await services.login_with_kakao_code(code, redirect_uri)
        elif provider == "naver":
            if not redirect_uri:
                raise HTTPException(status_code=400, detail="redirect_uri가 필요합니다.")
            pair = await services.login_with_naver_code(code, redirect_uri)
        else:
            raise HTTPException(status_code=404, detail="지원하지 않는 provider입니다.")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    _set_auth_cookies(response, pair["access_token"], pair["refresh_token"])
    return TokenResponse(**pair)


@router.get("/.well-known/jwks.json")
async def jwks() -> dict:
    try:
        return {"keys": [public_jwk()]}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
