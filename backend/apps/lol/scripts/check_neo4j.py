#!/usr/bin/env python3
"""Neo4j 연결 확인: MATCH (n) RETURN count(n).

사용 (backend/.env 에 NEO4J_* 설정 후):
  cd backend/apps && python -m lol.scripts.check_neo4j
또는:
  PYTHONPATH=backend:backend/apps python backend/apps/lol/scripts/check_neo4j.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# apps / backend 루트를 path에 올림
_APPS = Path(__file__).resolve().parents[2]
_BACKEND = _APPS.parent
for p in (_BACKEND, _APPS):
    s = str(p)
    if s not in sys.path:
        sys.path.insert(0, s)


async def main() -> int:
    from core.matrix.vault_keymaker_secret_manager import get_keymaker

    get_keymaker().load_environment()

    from lol.config import get_neo4j_uri
    from lol.neo4j import close_driver, get_driver

    uri = get_neo4j_uri()
    scheme = uri.split("://", 1)[0] if "://" in uri else "(unknown)"
    print(f"neo4j scheme: {scheme}  uri: {uri}")

    driver = get_driver()
    try:
        async with driver.session() as session:
            result = await session.run(
                "MATCH (n) RETURN count(n) AS node_count LIMIT 1"
            )
            rows = await result.data()
        print("ok:", rows)
        return 0
    finally:
        await close_driver()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
