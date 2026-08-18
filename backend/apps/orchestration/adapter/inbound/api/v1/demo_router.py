"""로그인 불필요 데모 API — 일정 밀도·겹침 체험."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from orchestration.app.briefing.calendar_source import (
    detect_calendar_conflicts,
    detect_calendar_density,
)
from orchestration.app.briefing.demo_schedule import (
    events_from_demo_items,
    get_home_meeting_events,
    save_user_meetings,
)
from orchestration.adapter.outbound.pg.daily_briefing_pg_repository import (
    DailyBriefingPgRepository,
)
from orchestration.app.briefing.format import today_seoul
from orchestration.app.composition.providers import get_orchestration_pg_repository
from orchestration.adapter.outbound.pg.orchestration_pg_repository import (
    OrchestrationPgRepository,
)

logger = logging.getLogger(__name__)
SEOUL = ZoneInfo("Asia/Seoul")

demo_router = APIRouter(prefix="/demo", tags=["demo"])

_TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})$")


class DemoCalendarEventIn(BaseModel):
    time: str = Field(..., description="HH:MM (Asia/Seoul, 오늘)")
    title: str = Field(..., min_length=1, max_length=120)


class DemoCalendarCheckRequest(BaseModel):
    events: list[DemoCalendarEventIn] = Field(..., min_length=1, max_length=10)


class DemoIssueOut(BaseModel):
    alert_type: str
    summary: str
    detail: str


class DemoCalendarCheckResponse(BaseModel):
    status: Literal["clear", "attention"]
    headline: str
    issues: list[DemoIssueOut]
    event_count: int


class DemoMeetingsSaveRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    events: list[DemoCalendarEventIn] = Field(default_factory=list, max_length=10)


class DemoMeetingsResponse(BaseModel):
    events: list[DemoCalendarEventIn]


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


def _events_out(rows: list[dict[str, str]]) -> list[DemoCalendarEventIn]:
    out: list[DemoCalendarEventIn] = []
    for row in rows:
        time = (row.get("time") or "").strip()
        title = (row.get("title") or "").strip()
        if time and title:
            out.append(DemoCalendarEventIn(time=time, title=title))
    return out


@demo_router.get("/meetings", response_model=DemoMeetingsResponse)
async def get_demo_meetings(
    user_id: int = Query(..., ge=1),
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> DemoMeetingsResponse:
    """홈에서 저장한 오늘 중요 미팅을 불러온다."""
    await repo.verify_user(user_id)
    items = await get_home_meeting_events(session, user_id)
    return DemoMeetingsResponse(events=_events_out(items))


@demo_router.put("/meetings", response_model=DemoMeetingsResponse)
async def put_demo_meetings(
    body: DemoMeetingsSaveRequest,
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> DemoMeetingsResponse:
    """홈에서 입력한 오늘 중요 미팅을 저장한다."""
    await repo.verify_user(body.user_id)
    payload = [{"time": e.time, "title": e.title} for e in body.events]
    items = await save_user_meetings(session, body.user_id, payload)
    briefing_repo = DailyBriefingPgRepository(session)
    await briefing_repo.delete_by_user_date(body.user_id, today_seoul())
    await session.commit()
    logger.info(
        "[demo.meetings] saved user_id=%s events=%s briefing_invalidated=true",
        body.user_id,
        len(items),
    )
    return DemoMeetingsResponse(events=_events_out(events_from_demo_items(items)))
