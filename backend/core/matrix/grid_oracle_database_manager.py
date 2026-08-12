from __future__ import annotations

import asyncio
import logging
import os
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

_DB_URL_ENV_KEYS = (
    "DATABASE_URL",
    "POSTGRES_URL",
    "DATABASE_PRIVATE_URL",
    "NEON_DATABASE_URL",
)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 선언형 모델의 기저 클래스 (Alembic 추적용)."""
    pass


engine: AsyncEngine | None = None
async_session_factory: async_sessionmaker[AsyncSession] | None = None


def _database_url_from_env() -> str:
    """요청 시점에 env를 읽는다. import 시점 스냅샷에 의존하지 않는다."""
    try:
        from core.matrix.vault_keymaker_secret_manager import get_keymaker

        get_keymaker().load_environment()
    except Exception:
        pass
    for key in _DB_URL_ENV_KEYS:
        val = (os.getenv(key) or "").strip()
        if val:
            return val
    return ""


def resolved_database_url() -> str:
    """Alembic·동기 도구용 — 설정된 DATABASE_URL을 비동기 psycopg 스킴으로 정규화."""
    raw = _database_url_from_env()
    if not raw:
        return ""
    return _resolve_database_url(raw)


def _resolve_database_url(raw_url: str) -> str:
    """Railway `postgres://` · Neon `postgresql://` → 비동기 psycopg 스킴."""
    url = raw_url.strip()
    if not url:
        msg = "DATABASE_URL이 설정되지 않았습니다."
        logger.error(msg)
        raise ValueError(msg)
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg" not in url and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return _ensure_sslmode(url)


def _ensure_sslmode(url: str) -> str:
    """원격 Postgres(Neon/Railway public)는 SSL이 필요한 경우가 많다."""
    if "sslmode=" in url.lower():
        return url
    hostish = url.lower()
    local_markers = (
        "localhost",
        "127.0.0.1",
        "@pgvector:",
        "@postgres:",
        ".railway.internal",
        "@db:",
    )
    if any(marker in hostish for marker in local_markers):
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}sslmode=require"


def init_engine() -> None:
    """FastAPI 앱 시작 시 혹은 첫 요청 시 엔진을 지연 초기화(Lazy Initialization)합니다."""
    global engine, async_session_factory
    raw_url = _database_url_from_env()
    if not raw_url:
        return

    if engine is not None:
        return

    resolved_url = _resolve_database_url(raw_url)

    engine = create_async_engine(
        resolved_url,
        echo=os.getenv("SQL_ECHO", "false").lower() in ("1", "true", "yes"),
        pool_pre_ping=True,
    )

    async_session_factory = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        autoflush=False,
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Dependency — 요청마다 비동기 세션 주입.

    컨트롤러·레포에서 ``commit()``을 쓰는 코드와, 커밋 없이 쓰는 유스케이스(James 등) 모두
    동작하도록 요청 종료 시 남은 변경분만 커밋합니다.
    """
    if async_session_factory is None:
        init_engine()

    if async_session_factory is None:
        raise HTTPException(
            status_code=503,
            detail="데이터베이스가 설정되지 않았습니다. DATABASE_URL을 확인하세요.",
        )

    try:
        async with async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except HTTPException:
                await session.rollback()
                raise
            except Exception:
                await session.rollback()
                logger.exception("DB 세션 및 트랜잭션 처리 중 오류 발생")
                raise
    except HTTPException:
        raise
    except OperationalError:
        logger.exception("DB 연결 실패")
        raise HTTPException(
            status_code=503,
            detail="데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        ) from None


async def dispose_engine() -> None:
    """FastAPI 셧다운 시 호출하여 클라우드 DB 커넥션 풀을 안전하게 닫습니다."""
    global engine, async_session_factory
    if engine is not None:
        await engine.dispose()
    engine = None
    async_session_factory = None
    logger.info("DB 엔진 디스포즈 완료 (커넥션 풀 반환)")


async def _test_main() -> None:
    """순수하게 Neon 클라우드 DB 연결 핑만 테스트합니다."""
    init_engine()
    if async_session_factory is None:
        logger.error("엔진 초기화 실패")
        return

    async with async_session_factory() as session:
        try:
            result = await session.execute(text("SELECT NOW()"))
            server_time = result.scalar_one()
            logger.info("✅ Neon PostgreSQL 연결 성공 — server_time=%s", server_time)
        except Exception as e:
            logger.error("❌ Neon PostgreSQL 연결 및 쿼리 실행 실패: %s", e)
        finally:
            await dispose_engine()


if __name__ == "__main__":
    import selectors
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    )

    if sys.platform == "win32":
        loop = asyncio.SelectorEventLoop(selectors.SelectSelector())
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_test_main())
        finally:
            loop.close()
    else:
        asyncio.run(_test_main())
