"""
Neo4j Async 드라이버 (Sandbox / 로컬 compose 공용).

실패 시 체크리스트:
- 아웃바운드 7687 포트 방화벽 허용 여부
- Sandbox 만료 여부 (보통 3일 후 만료)
- .env 로드 여부 (backend/.env 의 NEO4J_* , python-dotenv / Keymaker 로드 경로)
- Docker 실행 시 compose 가 NEO4J_URI 를 bolt://neo4j:7687 로 덮어쓰는지 확인
"""

from __future__ import annotations

import logging

from neo4j import AsyncDriver, AsyncGraphDatabase

from lol.config import get_neo4j_password, get_neo4j_uri, get_neo4j_user

logger = logging.getLogger(__name__)

_driver: AsyncDriver | None = None


def get_driver() -> AsyncDriver:
    """Lazy singleton AsyncDriver. star_craft 가 session()/run()/data() 계약으로 사용."""
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
    """앱 종료 시 드라이버 정리."""
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
        logger.info("[lol/neo4j] 드라이버 종료")
