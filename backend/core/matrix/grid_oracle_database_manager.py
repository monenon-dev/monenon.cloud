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
from sqlalchemy.orm import DeclarativeBase

from core.config import DATABASE_URL

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 선언형 모델의 기저 클래스 (Alembic 추적용)."""
    pass


engine: AsyncEngine | None = None
async_session_factory: async_sessionmaker[AsyncSession] | None = None


def resolved_database_url() -> str:
    """Alembic·동기 도구용 — 설정된 DATABASE_URL을 비동기 psycopg 스킴으로 정규화."""
    if not DATABASE_URL:
        return ""
    return _resolve_database_url(DATABASE_URL)


def _resolve_database_url(raw_url: str) -> str:
    """Neon DATABASE_URL → 비동기용 postgresql+psycopg 스킴으로 정규화."""
    url = raw_url.strip()
    if not url:
        msg = "DATABASE_URL이 설정되지 않았습니다."
        logger.error(msg)
        raise ValueError(msg)
    if url.startswith("postgresql://") and "+psycopg" not in url and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def init_engine() -> None:
    """FastAPI 앱 시작 시 혹은 첫 요청 시 엔진을 지연 초기화(Lazy Initialization)합니다."""
    global engine, async_session_factory
    if not DATABASE_URL:
        return

    if engine is not None:
        return

    resolved_url = _resolve_database_url(DATABASE_URL)

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
        raise RuntimeError("데이터베이스 엔진이 초기화되지 않았습니다.")

    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            logger.exception("DB 세션 및 트랜잭션 처리 중 오류 발생")
            raise


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
