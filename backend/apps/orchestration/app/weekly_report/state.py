"""LangGraph 주간 업무 리포트 그래프 공유 상태."""

from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict


class WeeklyReportState(TypedDict, total=False):
    user_id: int | None
    db_session: Any
    speech_tone: str | None
    user_type: str | None
    industry: str | None
    focus_areas: list[str]
    briefings: list[dict]
    aggregate_result: dict
    risks: list[dict]
    risk_result: dict
    next_actions: list[dict]
    actions_result: dict
    summary: str
    validation_ok: bool
    validation_notes: str
    synth_retries: int
    synth_pass: int
    tool_logs: Annotated[list[dict], operator.add]
    trace: Annotated[list[dict], operator.add]
