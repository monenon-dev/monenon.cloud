"""
Neo4j Async 드라이버 (Sandbox bolt:// · AuraDB neo4j+s:// · 로컬 compose 공용).

URI 스킴만으로 암호화 여부가 결정된다. encrypted= 옵션·스킴별 if 분기는 두지 않는다.

실패 시 체크리스트:
- 아웃바운드 7687 포트 방화벽 허용 여부 (주로 bolt:// Sandbox / 로컬)
- Sandbox 만료 여부 (보통 3일 후 만료)
- neo4j+s:// 사용 시 별도 encrypted 옵션 불필요 (URI가 이미 암호화 지정)
- AuraDB 인스턴스 일시정지(pause) 여부 — Aura 콘솔에서 Running 확인
- AuraDB Free tier 는 일정 기간 미사용 시 자동 일시정지될 수 있음 (만료와 별개)
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
