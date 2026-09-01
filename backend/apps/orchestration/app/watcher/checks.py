"""능동 알림 감지 체인."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.pg.notification_settings_pg_repository import (
    NotificationSettingsPgRepository,
)
from orchestration.app.briefing.calendar_source import (
    detect_calendar_conflicts,
    detect_calendar_density,
    fetch_calendar_window,
    fetch_today_calendar,
)
from orchestration.app.briefing.gmail_source import fetch_gmail_deadline_since
from orchestration.app.briefing.slack_source import fetch_slack_urgent_since
from orchestration.app.watcher.types import DetectedIssue


def _user_density_threshold(prefs: Any) -> int:
    try:
        value = int(getattr(prefs, "density_threshold", 3))
    except (TypeError, ValueError):
        value = 3
    if value not in (2, 3, 4):
        return 3
    return value


async def run_detection_checks(
    session: AsyncSession,
    user_id: int,
    *,
    since_seconds: float,
) -> list[DetectedIssue]:
    settings_repo = NotificationSettingsPgRepository(session)
    prefs = await settings_repo.get(user_id)

    issues: list[DetectedIssue] = []

    if prefs.alert_calendar_density:
        cal = await fetch_calendar_window(session, user_id, hours_ahead=3.0)
        events = cal.get("events") if isinstance(cal.get("events"), list) else []
        if events:
            issues.extend(
                detect_calendar_density(
                    events,
                    threshold=_user_density_threshold(prefs),
                    hours_ahead=3.0,
                )
            )
        today = await fetch_today_calendar(session, user_id)
        today_events = today.get("events") if isinstance(today.get("events"), list) else []
        if today_events:
            issues.extend(detect_calendar_conflicts(today_events))

    if prefs.alert_urgent_messages:
        slack = await fetch_slack_urgent_since(
            session, user_id, since_seconds=since_seconds
        )
        for item in slack.get("issues") or []:
            if isinstance(item, DetectedIssue):
                issues.append(item)

        since_hours = max(1.0, since_seconds / 3600.0)
        gmail = await fetch_gmail_deadline_since(
            session, user_id, since_hours=since_hours
        )
        for item in gmail.get("issues") or []:
            if isinstance(item, DetectedIssue):
                issues.append(item)

    return issues
