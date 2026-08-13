"""로그인 불필요 데모 API — 일정 밀도·겹침 체험."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from orchestration.app.briefing.calendar_source import (
    detect_calendar_conflicts,
    detect_calendar_density,
)

logger = logging.getLogger(__name__)
SEOUL = ZoneInfo("Asia/Seoul")

demo_router = APIRouter(prefix="/demo", tags=["demo"])

_TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})$")


class DemoCalendarEventIn(BaseModel):
    time: str = Field(..., description="HH:MM (Asia/Seoul, 오늘)")
    title: str = Field(..., min_length=1, max_length=120)


class DemoCalendarCheckRequest(BaseModel):
    events: list[DemoCalendarEventIn] = Field(..., min_length=1, max_length=3)


class DemoIssueOut(BaseModel):
    alert_type: str
    summary: str
    detail: str


class DemoCalendarCheckResponse(BaseModel):
    status: Literal["clear", "attention"]
    headline: str
    issues: list[DemoIssueOut]
    event_count: int


def _parse_today_event(index: int, item: DemoCalendarEventIn) -> dict:
    m = _TIME_RE.match(item.time.strip())
    if not m:
        raise HTTPException(
            status_code=400,
            detail=f"시간 형식이 올바르지 않습니다: {item.time} (HH:MM)",
        )
    hour, minute = int(m.group(1)), int(m.group(2))
    if hour > 23 or minute > 59:
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 시간입니다: {item.time}",
        )
    title = item.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="일정 제목을 입력해 주세요.")

    day = datetime.now(SEOUL).replace(second=0, microsecond=0)
    start = day.replace(hour=hour, minute=minute)
    end = start + timedelta(hours=1)
    return {
        "id": f"demo-{index}",
        "title": title,
        "time": {
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
        },
    }


def _headline_for(issues: list[DemoIssueOut], event_count: int) -> str:
    if not issues:
        return "✅ 오늘은 여유로운 하루네요"
    density = next((i for i in issues if i.alert_type == "calendar_density"), None)
    conflict = next((i for i in issues if i.alert_type == "calendar_conflict"), None)
    if conflict and density:
        return f"⚠️ {conflict.summary} · 일정도 몰려 있어요"
    if conflict:
        return f"⚠️ {conflict.summary}"
    if density:
        return f"⚠️ {density.detail}"
    return f"⚠️ 오늘 일정 {event_count}건을 확인해 보세요"


@demo_router.post("/calendar-check", response_model=DemoCalendarCheckResponse)
def demo_calendar_check(body: DemoCalendarCheckRequest) -> DemoCalendarCheckResponse:
    """입력한 오늘 일정으로 밀도·겹침만 검사한다. DB 저장 없음."""
    events = [_parse_today_event(i, row) for i, row in enumerate(body.events)]

    # 랜딩 체험용: 하루 단위로 몰림을 느끼도록 hours_ahead를 넓게 둔다.
    density_issues = detect_calendar_density(
        events,
        threshold=3,
        hours_ahead=24.0,
    )
    conflict_issues = detect_calendar_conflicts(events)

    issues = [
        DemoIssueOut(
            alert_type=i.alert_type,
            summary=i.summary,
            detail=i.detail,
        )
        for i in [*density_issues, *conflict_issues]
    ]
    status: Literal["clear", "attention"] = "attention" if issues else "clear"
    headline = _headline_for(issues, len(events))
    logger.info(
        "[demo.calendar-check] events=%s status=%s issues=%s",
        len(events),
        status,
        len(issues),
    )
    return DemoCalendarCheckResponse(
        status=status,
        headline=headline,
        issues=issues,
        event_count=len(events),
    )
