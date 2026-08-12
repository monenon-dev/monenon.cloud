"""주간 리포트 노드 이벤트 → 프론트 ToolStream용 tool_logs."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from zoneinfo import ZoneInfo

SEOUL = ZoneInfo("Asia/Seoul")

NodeStatus = Literal["running", "success", "failed", "retrying"]

_TOOL_NAME = {
    "weekly_router": "report.route",
    "aggregate_briefings": "report.aggregate",
    "risk_analyzer": "report.risk",
    "next_action_recommender": "report.actions",
    "report_synthesizer": "report.synthesize",
    "validator": "report.validate",
}

_RESULT_TYPE = {
    "weekly_router": "list",
    "aggregate_briefings": "list",
    "risk_analyzer": "list",
    "next_action_recommender": "list",
    "report_synthesizer": "draft",
    "validator": "list",
}


def _clock(ts: datetime | None = None) -> str:
    now = ts or datetime.now(SEOUL)
    return now.strftime("%H:%M:%S")


def make_node_event(
    node: str,
    *,
    status: NodeStatus,
    detail: str,
    attempt: int = 1,
    params: dict[str, str | int | float] | None = None,
    result: dict[str, Any] | None = None,
    error: dict[str, str] | None = None,
    seq: int | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    stamp = _clock(now)
    suffix = seq if seq is not None else f"{attempt}-{status}-{stamp.replace(':', '')}"
    entry: dict[str, Any] = {
        "id": f"weekly-{node}-{suffix}",
        "timestamp": stamp,
        "toolName": _TOOL_NAME.get(node, f"report.{node}"),
        "status": status,
        "params": params or {},
        "node": node,
        "attempt": attempt,
        "detail": detail,
    }
    if error is not None:
        entry["error"] = error
    elif result is not None:
        entry["result"] = result
    elif status == "failed":
        entry["error"] = {"code": "NODE_FAILED", "message": detail}
    return entry


def list_result(items: list[dict[str, Any]], *, result_type: str = "list") -> dict[str, Any]:
    return {"type": result_type, "items": items}
