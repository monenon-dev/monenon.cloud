"""FastAPI 의존성 — JWT 검증만 (개인키·apps.auth 미사용)."""

from __future__ import annotations

import os
from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis

from core.security import ACCESS_COOKIE, DEFAULT_AUD, TokenPayload, verify_token

_REDIS: Redis | None = None


def _service_aud() -> str:
    return os.getenv("SERVICE_AUD", DEFAULT_AUD).strip() or DEFAULT_AUD


def _redis() -> Redis:
    global _REDIS
    if _REDIS is None:
        url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0").strip()
        _REDIS = Redis.from_url(url, decode_responses=True)
    return _REDIS


def extract_bearer_or_cookie(request: Request) -> str | None:
    auth = request.headers.get("Authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    return request.cookies.get(ACCESS_COOKIE)


async def is_jti_revoked(jti: str) -> bool:
    try:
        return bool(await _redis().exists(f"monenon:auth:blacklist:{jti}"))
    except Exception:
        return False


async def get_authenticated_user_id(
    user: TokenPayload = Depends(get_current_user),
) -> int:
    try:
        return int(user.sub)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 사용자입니다.",
        ) from exc

async def get_authenticated_user_id(
    user: TokenPayload = Depends(get_current_user),
) -> int:
    try:
        return int(user.sub)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 사용자입니다.",
        ) from exc

class RoleChecker:
    """허용 role 문자열 (예: \"user\", \"admin\"). auth.rbac.Role 값과 동일."""

    def __init__(self, *allowed: str) -> None:
        self._allowed = set(allowed)

    def __call__(
        self, user: TokenPayload = Depends(get_current_user)
    ) -> TokenPayload:
        if not self._allowed.intersection(user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="권한이 없습니다.",
            )
        return user


def require_roles(*allowed: str) -> Callable[..., TokenPayload]:
    return RoleChecker(*allowed)
