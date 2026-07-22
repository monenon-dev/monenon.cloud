"""브리핑 LangGraph 실행 유스케이스."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.app.briefing.graph import build_briefing_graph


async def run_briefing(
    *,
    query: str,
    session: AsyncSession | None = None,
    user_id: int | None = None,
    speech_tone: str | None = None,
    user_type: str | None = None,
    industry: str | None = None,
) -> dict[str, Any]:
    graph = build_briefing_graph()
    initial: dict[str, Any] = {
        "query": query.strip(),
        "user_id": user_id,
        "db_session": session,
        "speech_tone": speech_tone,
        "user_type": user_type,
        "industry": industry,
        "trace": [],
    }
    final = await graph.ainvoke(initial)
    return {
        "answer": final.get("answer", ""),
        "trace": final.get("trace") or [],
        "agent_results": {
            "calendar": final.get("calendar_result"),
            "docs": final.get("docs_result"),
            "slack": final.get("slack_result"),
        },
    }
