"""주간 리포트 그래프 결과를 채팅·API용 마크다운으로 변환."""

from __future__ import annotations

from typing import Any


def _severity_label(severity: str) -> str:
    if severity == "high":
        return "높음"
    if severity == "low":
        return "낮음"
    return "보통"


def _priority_label(priority: str) -> str:
    if priority == "high":
        return "높음"
    if priority == "low":
        return "낮음"
    return "보통"


def format_weekly_report_markdown(payload: dict[str, Any]) -> str:
    """summary·risks·next_actions를 채팅 말풍선용 마크다운으로 합친다."""
    lines: list[str] = ["## 주간 업무 리포트", ""]

    summary = (payload.get("summary") or "").strip()
    if summary:
        lines.append(summary)
        lines.append("")

    risks = payload.get("risks") if isinstance(payload.get("risks"), list) else []
    if risks:
        lines.append("## 리스크")
        for item in risks:
            if not isinstance(item, dict):
                continue
            title = (item.get("title") or "리스크").strip()
            severity = _severity_label(str(item.get("severity") or "medium"))
            detail = (item.get("detail") or "").strip()
            lines.append(f"- **{title}** ({severity})")
            if detail:
                lines.append(f"  {detail}")
        lines.append("")

    actions = (
        payload.get("next_actions")
        if isinstance(payload.get("next_actions"), list)
        else []
    )
    if actions:
        lines.append("## 다음 액션")
        for item in actions:
            if not isinstance(item, dict):
                continue
            title = (item.get("title") or "액션").strip()
            priority = _priority_label(str(item.get("priority") or "medium"))
            detail = (item.get("detail") or "").strip()
            lines.append(f"- **{title}** (우선순위: {priority})")
            if detail:
                lines.append(f"  {detail}")

    body = "\n".join(lines).strip()
    return body or "주간 리포트를 생성하지 못했습니다."
