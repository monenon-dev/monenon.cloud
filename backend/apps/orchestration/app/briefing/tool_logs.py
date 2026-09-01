"""브리핑 노드 이벤트 → 프론트 ToolStream용 tool_logs."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from zoneinfo import ZoneInfo

SEOUL = ZoneInfo("Asia/Seoul")

NodeStatus = Literal["running", "success", "failed", "retrying"]

_TOOL_NAME = {
    "router": "briefing.route",
    "calendar": "calendar.list",
    "docs": "docs.search",
    "history": "history.digest",
    "slack": "slack.digest",
    "gmail": "gmail.digest",
    "synthesizer": "briefing.synthesize",
    "validator": "briefing.validate",
}

_RESULT_TYPE = {
    "calendar": "list",
    "docs": "rag",
    "history": "list",
    "slack": "list",
    "gmail": "list",
    "synthesizer": "draft",
    "validator": "list",
    "router": "list",
}


def _clock(ts: datetime | None = None) -> str:
    now = ts or datetime.now(SEOUL)
    return now.strftime("%H:%M:%S")


def _items_from_agent(result: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(result, dict):
        return []
    raw = result.get("items")
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        title = item.get("title")
        row: dict[str, Any] = {
            "title": title if isinstance(title, str) else "항목",
        }
        if isinstance(item.get("preview"), str):
            row["preview"] = item["preview"]
        if isinstance(item.get("meta"), str):
            row["meta"] = item["meta"]
        if isinstance(item.get("score"), (int, float)):
            row["score"] = float(item["score"])
        out.append(row)
    return out


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
    """기존 ToolCallResult 필드 + node/attempt/detail 확장."""
    stamp = _clock(now)
    suffix = seq if seq is not None else f"{attempt}-{status}-{stamp.replace(':', '')}"
    entry: dict[str, Any] = {
        "id": f"briefing-{node}-{suffix}",
        "timestamp": stamp,
        "toolName": _TOOL_NAME.get(node, f"briefing.{node}"),
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
    elif status in ("running", "retrying"):
        pass
    elif status == "failed":
        entry["error"] = {
            "code": "NODE_FAILED",
            "message": detail,
        }
    return entry


def detail_for_tool(node: str, result: dict[str, Any] | None) -> str:
    if not isinstance(result, dict):
        return f"{node} 실행 완료"
    status = result.get("status")
    items = result.get("items") if isinstance(result.get("items"), list) else []
    n = len(items)
    if status == "skipped":
        detail = result.get("detail")
        if isinstance(detail, str) and detail.strip():
            return detail.strip()
        reason = result.get("reason") or "건너뜀"
        return f"{node} 건너뜀 ({reason})"
    if status == "empty":
        return f"{node} 조회 완료, 항목 없음"
    if status == "error":
        return f"{node} 실패: {result.get('reason') or '오류'}"
    if node == "calendar":
        return f"캘린더 조회 완료, 이벤트 {n}건"
    if node == "docs":
        return f"문서 검색 완료, 히트 {n}건"
    if node == "history":
        return f"최근 대화 요약 완료, 메시지 {n}건"
    if node == "slack":
        return f"Slack digest 완료, {n}건"
    if node == "gmail":
        return f"Gmail digest 완료, 미읽음 {n}건"
    return f"{node} 완료 ({n}건)"


def tool_result_payload(node: str, result: dict[str, Any] | None) -> dict[str, Any]:
    items = _items_from_agent(result)
    return {
        "type": _RESULT_TYPE.get(node, "list"),
        "items": items,
    }


def events_for_tool_node(
    node: str,
    result: dict[str, Any] | None,
    *,
    attempt: int = 1,
    seq_base: int = 0,
) -> list[dict[str, Any]]:
    """running → success|failed 한 쌍."""
    params: dict[str, str | int | float] = {}
    if isinstance(result, dict) and isinstance(result.get("params"), dict):
        params = {
            k: v
            for k, v in result["params"].items()
            if isinstance(v, (str, int, float))
        }

    detail = detail_for_tool(node, result)
    agent_status = (result or {}).get("status") if isinstance(result, dict) else None
    failed = agent_status == "error"

    running = make_node_event(
        node,
        status="running",
        detail=f"{node} 실행 중…",
        attempt=attempt,
        params=params,
        seq=seq_base,
    )
    if failed:
        done = make_node_event(
            node,
            status="failed",
            detail=detail,
            attempt=attempt,
            params=params,
            error={
                "code": "TOOL_ERROR",
                "message": str((result or {}).get("reason") or detail),
            },
            seq=seq_base + 1,
        )
    else:
        done = make_node_event(
            node,
            status="success",
            detail=detail,
            attempt=attempt,
            params=params,
            result=tool_result_payload(node, result),
            seq=seq_base + 1,
        )
    return [running, done]


def build_tool_logs(
    *,
    calendar: dict[str, Any] | None,
    docs: dict[str, Any] | None,
    history: dict[str, Any] | None,
    selected_tools: list[str] | None = None,
    now: datetime | None = None,
) -> list[dict[str, Any]]:
    """레거시 폴백 — 도구 결과만 요약 이벤트로 변환."""
    selected = set(selected_tools or ["calendar", "docs", "history"])
    logs: list[dict[str, Any]] = []
    idx = 0
    for key, result in (
        ("calendar", calendar),
        ("docs", docs),
        ("history", history),
    ):
        if key not in selected:
            continue
        pair = events_for_tool_node(key, result, attempt=1, seq_base=idx * 2)
        # running 생략하고 완료만 (폴백 단순화)
        logs.append(pair[-1])
        idx += 1
    return logs
