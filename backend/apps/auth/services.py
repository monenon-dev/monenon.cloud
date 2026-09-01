"""인증 오케스트레이션 — 로그인·OAuth·리프레시·세션 폐기."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import httpx
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from auth.rbac import Role
from core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_refresh_token,
)
from secretary.adapter.outbound.orm.user_model import User, UserRole

logger = logging.getLogger(__name__)

ACCESS_TTL_MIN = int(os.getenv("JWT_ACCESS_TTL_MIN", "10"))
REFRESH_TTL_DAYS = int(os.getenv("JWT_REFRESH_TTL_DAYS", "14"))
SERVICE_AUD = os.getenv("SERVICE_AUD", "monenon-api").strip() or "monenon-api"

_REDIS: Redis | None = None
_SESSION_FACTORY: async_sessionmaker[AsyncSession] | None = None


def _redis() -> Redis:
    global _REDIS
    if _REDIS is None:
        url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0").strip()
        _REDIS = Redis.from_url(url, decode_responses=True)
    return _REDIS


def _session_factory() -> async_sessionmaker[AsyncSession]:
    global _SESSION_FACTORY
    if _SESSION_FACTORY is None:
        url = os.getenv("DATABASE_URL", "").strip()
        if not url:
            raise RuntimeError("DATABASE_URL이 필요합니다.")
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        engine = create_async_engine(url, pool_pre_ping=True)
        _SESSION_FACTORY = async_sessionmaker(engine, expire_on_commit=False)
    return _SESSION_FACTORY


def _roles_for_user(user: User) -> list[str]:
    if user.role == UserRole.ADMIN:
        return [Role.ADMIN.value, Role.USER.value]
    return [Role.USER.value]


async def _store_refresh(sub: str, jti: str, refresh_token: str, ttl_sec: int) -> None:
    r = _redis()
    await r.setex(f"monenon:auth:refresh:{jti}", ttl_sec, refresh_token)
    await r.sadd(f"monenon:auth:user_sessions:{sub}", jti)
    await r.expire(f"monenon:auth:user_sessions:{sub}", ttl_sec)


async def revoke_all_sessions(sub: str) -> None:
    r = _redis()
    key = f"monenon:auth:user_sessions:{sub}"
    jtis = await r.smembers(key)
    pipe = r.pipeline()
    for jti in jtis:
        pipe.delete(f"monenon:auth:refresh:{jti}")
        pipe.setex(f"monenon:auth:blacklist:{jti}", REFRESH_TTL_DAYS * 86400, "1")
    pipe.delete(key)
    await pipe.execute()


async def blacklist_access_jti(jti: str, ttl_sec: int) -> None:
    await _redis().setex(f"monenon:auth:blacklist:{jti}", max(ttl_sec, 60), "1")


async def issue_token_pair(user: User) -> dict:
    roles = _roles_for_user(user)
    sub = str(user.id)
    access = create_access_token(sub, roles, SERVICE_AUD, expires_min=ACCESS_TTL_MIN)
    refresh = create_refresh_token(sub, expires_days=REFRESH_TTL_DAYS)
    payload = verify_refresh_token(refresh)
    ttl = REFRESH_TTL_DAYS * 86400
    await _store_refresh(sub, payload.jti, refresh, ttl)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "expires_in": ACCESS_TTL_MIN * 60,
        "roles": roles,
    }


async def login_with_password(email: str, password: str) -> dict:
    async with _session_factory()() as session:
        result = await session.execute(
            select(User).where(User.email == email.strip().lower())
        )
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("이메일 또는 비밀번호가 올바르지 않습니다.")
        return await issue_token_pair(user)


async def refresh_tokens(refresh_token: str) -> dict:
    payload = verify_refresh_token(refresh_token)
    r = _redis()
    key = f"monenon:auth:refresh:{payload.jti}"
    stored = await r.get(key)
    if stored is None:
        # 재사용 또는 만료 — 세션 전체 폐기
        await revoke_all_sessions(payload.sub)
        raise ValueError("리프레시 토큰이 유효하지 않습니다. 다시 로그인해 주세요.")
    if stored != refresh_token:
        await revoke_all_sessions(payload.sub)
        raise ValueError("리프레시 토큰 재사용이 감지되었습니다.")

    await r.delete(key)
    await r.srem(f"monenon:auth:user_sessions:{payload.sub}", payload.jti)

    async with _session_factory()() as session:
        result = await session.execute(select(User).where(User.id == int(payload.sub)))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("사용자를 찾을 수 없습니다.")
        return await issue_token_pair(user)


async def logout(refresh_token: str | None, access_jti: str | None = None) -> None:
    if access_jti:
        await blacklist_access_jti(access_jti, ACCESS_TTL_MIN * 60)
    if not refresh_token:
        return
    try:
        payload = verify_refresh_token(refresh_token)
    except Exception:
        return
    await revoke_all_sessions(payload.sub)


async def login_with_google_id_token(credential: str) -> dict:
    from secretary.app.use_cases.google_auth import verify_google_id_token

    profile = verify_google_id_token(credential)
    email = profile.get("email")
    if not isinstance(email, str) or "@" not in email:
        raise ValueError("Google 이메일을 확인할 수 없습니다.")
    return await _find_user_and_issue(email.strip().lower())


async def login_with_kakao_code(code: str, redirect_uri: str) -> dict:
    from secretary.app.use_cases.kakao_oauth import exchange_kakao_code

    full = await exchange_kakao_code(code, redirect_uri)
    email = full.get("email")
    if not isinstance(email, str):
        raise ValueError("카카오 이메일을 확인할 수 없습니다.")
    return await _find_user_and_issue(email)


async def login_with_naver_code(code: str, redirect_uri: str) -> dict:
    from secretary.app.use_cases.naver_oauth import fetch_naver_profile

    profile = await fetch_naver_profile(code, redirect_uri)
    email = profile.get("email")
    if not isinstance(email, str):
        raise ValueError("네이버 이메일을 확인할 수 없습니다.")
    return await _find_user_and_issue(email)


async def _find_user_and_issue(email: str) -> dict:
    async with _session_factory()() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError(
                "등록된 사용자가 없습니다. 기존 서비스에서 먼저 가입해 주세요."
            )
        return await issue_token_pair(user)
