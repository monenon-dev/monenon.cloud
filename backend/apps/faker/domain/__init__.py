"""faker 도메인 — 오케스트레이터 작업 상태."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


TaskStatus = Literal["pending", "routing", "executing", "done", "error"]


@dataclass
class OrchestratorState:
    """LangGraph 상태 그래프 노드 간 공유되는 상태."""
    query: str
    user_id: int | None = None
    spoke: str | None = None           # 선택된 스포크
    spoke_result: dict | None = None   # 스포크 실행 결과
    status: TaskStatus = "pending"
    error: str | None = None
    messages: list[dict] = field(default_factory=list)
