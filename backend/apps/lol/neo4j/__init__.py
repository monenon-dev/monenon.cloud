"""lol core — Neo4j 드라이버 (비동기)."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from neo4j import AsyncDriver, AsyncGraphDatabase

from lol.config import get_neo4j_password, get_neo4j_uri, get_neo4j_user

logger = logging.getLogger(__name__)

_driver: AsyncDriver | None = None


def get_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        uri = get_neo4j_uri()
        _driver = AsyncGraphDatabase.driver(
            uri,
            auth=(get_neo4j_user(), get_neo4j_password()),
        )
        logger.info("[lol/neo4j] 드라이버 초기화: %s", uri)
    return _driver


async def close_driver() -> None:
    global _driver
    if _driver:
        await _driver.close()
        _driver = None


@asynccontextmanager
async def get_session() -> AsyncGenerator:
    """Neo4j 세션 컨텍스트 매니저."""
    driver = get_driver()
    async with driver.session() as session:
        yield session


async def run_query(cypher: str, params: dict | None = None) -> list[dict]:
    """단순 Cypher 실행 → 결과 리스트 반환."""
    async with get_session() as session:
        result = await session.run(cypher, params or {})
        return [record.data() async for record in result]
