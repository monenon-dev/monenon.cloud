"""LangGraph 브리핑 그래프 공유 상태."""

from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict


class BriefingState(TypedDict, total=False):
    query: str
    user_id: int | None
    db_session: Any
    speech_tone: str | None
    user_type: str | None
    industry: str | None
    selected_tools: list[str]
    calendar_result: dict
    docs_result: dict
    history_result: dict
    # legacy alias kept for older callers
    slack_result: dict
    answer: str
    validation_ok: bool
    validation_notes: str
    synth_retries: int
    synth_pass: int
    # 노드마다 append (재시도 포함 전체 타임라인)
    tool_logs: Annotated[list[dict], operator.add]
    trace: Annotated[list[dict], operator.add]
