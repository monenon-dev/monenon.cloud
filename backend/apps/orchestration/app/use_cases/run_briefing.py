"""브리핑 LangGraph 실행 유스케이스."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.app.briefing.graph import build_briefing_graph
from orchestration.app.briefing.tool_logs import build_tool_logs
from orchestration.app.briefing.validator_mode import load_briefing_validator_mode
from orchestration.app.briefing.validator_review import normalize_pending_review


async def run_briefing(
    *,
    query: str,
    session: AsyncSession | None = None,
    user_id: int | None = None,
    speech_tone: str | None = None,
    user_type: str | None = None,
    industry: str | None = None,
) -> dict[str, Any]:
    validator_mode = await load_briefing_validator_mode(session, user_id)
    graph = build_briefing_graph()
    initial: dict[str, Any] = {
        "query": query.strip(),
        "user_id": user_id,
        "db_session": session,
        "speech_tone": speech_tone,
        "user_type": user_type,
        "industry": industry,
        "validator_mode": validator_mode,
        "trace": [],
        "tool_logs": [],
        "synth_pass": 0,
        "synth_retries": 0,
    }
    final = await graph.ainvoke(initial)
    history = final.get("history_result")
    slack = final.get("slack_summary") or final.get("slack_result")
    gmail = final.get("gmail_summary")
    tool_logs = final.get("tool_logs")
    if not isinstance(tool_logs, list) or not tool_logs:
        tool_logs = build_tool_logs(
            calendar=final.get("calendar_result"),
            docs=final.get("docs_result"),
            history=history if isinstance(history, dict) else None,
            selected_tools=final.get("selected_tools"),
        )
    return {
        "answer": final.get("answer", ""),
        "pending_review": normalize_pending_review(final.get("pending_review")),
        "trace": final.get("trace") or [],
        "tool_logs": tool_logs,
        "agent_results": {
            "calendar": final.get("calendar_result"),
            "docs": final.get("docs_result"),
            "history": history,
            "slack": slack,
            "gmail": gmail,
        },
    }
