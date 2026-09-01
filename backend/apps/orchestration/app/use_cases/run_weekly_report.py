"""주간 업무 리포트 LangGraph 실행 유스케이스."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.app.weekly_report.graph import build_weekly_report_graph


async def run_weekly_report(
    *,
    session: AsyncSession,
    user_id: int,
    speech_tone: str | None = None,
    user_type: str | None = None,
    industry: str | None = None,
) -> dict[str, Any]:
    graph = build_weekly_report_graph()
    initial: dict[str, Any] = {
        "user_id": user_id,
        "db_session": session,
        "speech_tone": speech_tone,
        "user_type": user_type,
        "industry": industry,
        "trace": [],
        "tool_logs": [],
        "synth_pass": 0,
        "synth_retries": 0,
        "risks": [],
        "next_actions": [],
    }
    final = await graph.ainvoke(initial)
    tool_logs = final.get("tool_logs")
    if not isinstance(tool_logs, list):
        tool_logs = []
    risks = final.get("risks")
    if not isinstance(risks, list):
        risks = []
    next_actions = final.get("next_actions")
    if not isinstance(next_actions, list):
        next_actions = []
    return {
        "summary": final.get("summary") or "",
        "risks": risks,
        "next_actions": next_actions,
        "tool_logs": tool_logs,
        "trace": final.get("trace") or [],
    }
