"""Google Calendar(n8n) + 톡캘린더 동기화."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from gemini_caller import call_gemini
from mail.calendar_app.kakao_talk_calendar import sync_event_to_kakao

logger = logging.getLogger(__name__)

calendar_router = APIRouter(prefix="/calendar", tags=["calendar"])

_PARSE_PROMPT = """사용자의 자연어 일정 요청을 파싱해서 JSON으로 변환해줘.
오늘 날짜: {today}

사용자 요청: {text}

반드시 아래 JSON 형식으로만 답해:
{{
  "title": "일정 제목",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "description": "설명 (없으면 빈 문자열)",
  "location": "장소 (없으면 빈 문자열)"
}}

날짜/시간이 불명확하면 합리적으로 추론해. 종료 시간이 없으면 시작+1시간.
start_time, end_time, description, location은 반드시 문자열이어야 하며 null을 쓰지 마."""


class CalendarAddRequest(BaseModel):
    user_id: int
    text: str = Field(..., min_length=1, description="자연어 일정 요청")
    confirm_overlap: bool = False


class CalendarEvent(BaseModel):
    title: str
    date: str
    start_time: str
    end_time: str
    description: str = ""
    location: str = ""


class CalendarAddResponse(BaseModel):
    ok: bool
    event: CalendarEvent | None = None
    message: str = ""
    needs_confirm: bool = False
    conflicts: list[dict] = Field(default_factory=list)
    kakao: dict | None = None


class KakaoSyncBody(BaseModel):
    user_id: int
    title: str = Field(..., min_length=1)
    date: str | None = Field(default=None, description="YYYY-MM-DD")
    start_time: str | None = Field(default=None, description="HH:MM")
    end_time: str | None = Field(default=None, description="HH:MM")
    start: str | None = Field(default=None, description="ISO start (schedule UI)")
    end: str | None = Field(default=None, description="ISO end")
    description: str = ""
    location: str = ""
    confirm_overlap: bool = False


def _as_str(value: object, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _add_hour(time_str: str) -> str:
    parsed = datetime.strptime(time_str, "%H:%M")
    return (parsed + timedelta(hours=1)).strftime("%H:%M")


def _normalize_calendar_data(data: dict) -> dict:
    normalized = dict(data)

    if not _as_str(normalized.get("start_time")) and _as_str(normalized.get("start")):
        normalized["start_time"] = _as_str(normalized.get("start"))
    if not _as_str(normalized.get("end_time")) and _as_str(normalized.get("end")):
        normalized["end_time"] = _as_str(normalized.get("end"))

    normalized["title"] = _as_str(normalized.get("title"))
    normalized["date"] = _as_str(normalized.get("date"))
    normalized["start_time"] = _as_str(normalized.get("start_time"))
    normalized["end_time"] = _as_str(normalized.get("end_time"))
    normalized["description"] = _as_str(normalized.get("description"))
    normalized["location"] = _as_str(normalized.get("location"))

    if not normalized["start_time"]:
        normalized["start_time"] = "09:00"
    if not normalized["end_time"]:
        normalized["end_time"] = _add_hour(normalized["start_time"])

    return normalized


def _split_iso_local(start: str, end: str) -> tuple[str, str, str]:
    """ISO-ish start/end → date, start_time, end_time (Asia/Seoul wall clock)."""
    def _parts(raw: str) -> tuple[str, str]:
        cleaned = raw.replace("Z", "").replace(" ", "T")
        if "T" in cleaned:
            d, t = cleaned.split("T", 1)
            return d[:10], t[:5]
        return cleaned[:10], "09:00"

    date, start_time = _parts(start)
    _, end_time = _parts(end)
    return date, start_time, end_time


@calendar_router.post("/add", response_model=CalendarAddResponse)
async def add_calendar_event(
    body: CalendarAddRequest,
    session: AsyncSession = Depends(get_db),
) -> CalendarAddResponse:
    today = datetime.now().strftime("%Y-%m-%d (%A)")
    try:
        raw = call_gemini(_PARSE_PROMPT.format(today=today, text=body.text))
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end])
        event = CalendarEvent(**_normalize_calendar_data(data))
    except Exception as exc:
        logger.error("[calendar] Gemini 파싱 실패: %s", exc)
        raise HTTPException(status_code=503, detail=f"일정 파싱 실패: {exc}") from exc

    kakao_result = await sync_event_to_kakao(
        session,
        body.user_id,
        title=event.title,
        date=event.date,
        start_time=event.start_time,
        end_time=event.end_time,
        description=event.description,
        location=event.location,
        confirm_overlap=body.confirm_overlap,
    )
    if kakao_result.get("needs_confirm"):
        return CalendarAddResponse(
            ok=False,
            event=event,
            needs_confirm=True,
            conflicts=list(kakao_result.get("conflicts") or []),
            message=str(kakao_result.get("message") or "겹치는 일정이 있습니다."),
            kakao=kakao_result,
        )

    n8n_url = os.getenv("N8N_CALENDAR_WEBHOOK_URL", "").strip()
    if n8n_url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(
                    n8n_url,
                    json={
                        "title": event.title,
                        "date": event.date,
                        "start_time": event.start_time,
                        "end_time": event.end_time,
                        "description": event.description,
                        "location": event.location,
                    },
                )
            logger.info("[calendar] n8n 호출 완료: %s %s", event.date, event.title)
        except Exception as exc:
            logger.warning("[calendar] n8n 호출 실패: %s", exc)
            raise HTTPException(status_code=502, detail=f"캘린더 등록 실패: {exc}") from exc
    else:
        logger.warning("[calendar] N8N_CALENDAR_WEBHOOK_URL 미설정")

    msg = f"{event.date} {event.start_time}에 '{event.title}' 일정이 등록되었습니다."
    if kakao_result.get("ok"):
        msg += " 톡캘린더에도 반영했습니다."
    elif kakao_result.get("reason") == "needs_consent":
        msg += " (톡캘린더 연동 동의 필요)"
    elif kakao_result.get("skipped") and kakao_result.get("reason") != "sync_off":
        msg += f" (톡캘린더: {kakao_result.get('message') or kakao_result.get('reason')})"

    await session.commit()
    return CalendarAddResponse(ok=True, event=event, message=msg, kakao=kakao_result)


@calendar_router.post("/kakao/sync")
async def sync_to_kakao_calendar(
    body: KakaoSyncBody,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """orchestration/schedule 등에서 구조화 일정을 톡캘린더로 보냄."""
    if body.start and body.end:
        date, start_time, end_time = _split_iso_local(body.start, body.end)
    elif body.date and body.start_time and body.end_time:
        date, start_time, end_time = body.date, body.start_time, body.end_time
    else:
        raise HTTPException(status_code=400, detail="일정 시작·종료 시각이 필요합니다.")

    result = await sync_event_to_kakao(
        session,
        body.user_id,
        title=body.title,
        date=date,
        start_time=start_time,
        end_time=end_time,
        description=body.description,
        location=body.location,
        confirm_overlap=body.confirm_overlap,
    )
    await session.commit()
    if result.get("needs_confirm"):
        return {"ok": False, **result}
    if result.get("reason") == "needs_consent":
        raise HTTPException(status_code=403, detail=result.get("message") or "톡캘린더 동의가 필요합니다.")
    if result.get("skipped") and result.get("reason") == "sync_off":
        return {"ok": True, "skipped": True, "message": "톡캘린더 연동이 꺼져 있습니다."}
    if result.get("ok"):
        return result
    raise HTTPException(status_code=502, detail=result.get("message") or "톡캘린더 동기화 실패")


@calendar_router.get("/ping")
def ping() -> dict:
    return {"ok": True}
