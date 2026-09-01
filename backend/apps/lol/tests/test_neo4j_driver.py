"""Neo4j 드라이버 연결 스모크 테스트 (실 Sandbox/.env 필요 시만 실행)."""

from __future__ import annotations

import os

import pytest


def _neo4j_configured() -> bool:
    uri = (os.getenv("NEO4J_URI") or "").strip()
    password = (os.getenv("NEO4J_PASSWORD") or "").strip()
    if not uri or not password:
        return False
    if "<sandbox" in uri or "<sandbox" in password:
        return False
    return True


@pytest.mark.asyncio
@pytest.mark.skipif(not _neo4j_configured(), reason="NEO4J_URI/PASSWORD 미설정")
async def test_neo4j_node_count():
    from lol.neo4j import close_driver, get_driver

    driver = get_driver()
    try:
        async with driver.session() as session:
            result = await session.run(
                "MATCH (n) RETURN count(n) AS node_count LIMIT 1"
            )
            rows = await result.data()
        assert rows
        assert "node_count" in rows[0]
        assert isinstance(rows[0]["node_count"], int)
    finally:
        await close_driver()
