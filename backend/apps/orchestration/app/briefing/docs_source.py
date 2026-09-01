"""브리핑용 문서/노트 변경 소스 — 연동 없으면 skipped."""

from __future__ import annotations

from typing import Any


async def fetch_recent_docs(_user_id: int | None) -> dict[str, Any]:
    """문서 스토어 미연동 시 skipped. 연동되면 여기만 교체하면 된다."""
    return {
        "source": "docs",
        "status": "skipped",
        "tool": "docs.search",
        "reason": "docs_store_not_connected",
        "params": {"q": "recent", "top_k": 5},
        "items": [],
        "summary": "연결된 문서 저장소가 없어 문서 변경 요약을 건너뜁니다.",
    }
