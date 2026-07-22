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
    calendar_result: dict
    docs_result: dict
    slack_result: dict
    trace: Annotated[list[dict], operator.add]
    answer: str
