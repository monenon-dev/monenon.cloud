"""브리핑 트레이스 → 프론트 ToolStream용 tool_logs 변환."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

SEOUL = ZoneInfo("Asia/Seoul")


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


def _result_type(tool_name: str) -> str:
    if tool_name.startswith("docs."):
        return "rag"
    return "list"


def _status_from_agent(result: dict[str, Any] | None) -> str:
    if not isinstance(result, dict):
        return "error"
    status = result.get("status")
    if status in ("success", "simulated"):
        return "success"
    if status in ("skipped", "empty"):
        return "success"
    if status == "error":
        return "error"
    return "success"


def build_tool_logs(
    *,
    calendar: dict[str, Any] | None,
    docs: dict[str, Any] | None,
    history: dict[str, Any] | None,
    selected_tools: list[str] | None = None,
    now: datetime | None = None,
) -> list[dict[str, Any]]:
    """ToolCallResult 호환 dict 목록."""
    stamp = now or datetime.now(timezone.utc)
    selected = set(selected_tools or ["calendar", "docs", "history"])
    sources: list[tuple[str, str, dict[str, Any] | None]] = []
    if "calendar" in selected:
        sources.append(("calendar.list", "calendar", calendar))
    if "docs" in selected:
        sources.append(("docs.search", "docs", docs))
    if "history" in selected:
        sources.append(("history.digest", "history", history))

    logs: list[dict[str, Any]] = []
    for idx, (tool_name, _key, result) in enumerate(sources):
        params: dict[str, Any] = {}
        if isinstance(result, dict) and isinstance(result.get("params"), dict):
            params = {
                k: v
                for k, v in result["params"].items()
                if isinstance(v, (str, int, float))
            }
        items = _items_from_agent(result)
        status = _status_from_agent(result)
        entry: dict[str, Any] = {
            "id": f"briefing-{tool_name}-{idx}",
            "timestamp": _clock(stamp.astimezone(SEOUL)),
            "toolName": tool_name,
            "status": status,
            "params": params,
        }
        if status == "error":
            entry["error"] = {
                "code": "TOOL_ERROR",
                "message": str((result or {}).get("reason") or "도구 실행 실패"),
            }
        else:
            entry["result"] = {
                "type": _result_type(tool_name),
                "items": items,
            }
        logs.append(entry)
    return logs
