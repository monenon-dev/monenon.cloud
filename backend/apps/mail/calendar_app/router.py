"""Google Calendar — Gemini 자연어 파싱 후 n8n으로 일정 등록."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from gemini_caller import call_gemini

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

날짜/시간이 불명확하면 합리적으로 추론해. 종료 시간이 없으면 시작+1시간."""


class CalendarAddRequest(BaseModel):
    user_id: int
    text: str = Field(..., min_length=1, description="자연어 일정 요청")


class CalendarEvent(BaseModel):
    title: str
    date: str
    start_time: str
    end_time: str
    description: str = ""
    location: str = ""


class CalendarAddResponse(BaseModel):
    ok: bool
    event: CalendarEvent
    message: str = ""


@calendar_router.post("/add", response_model=CalendarAddResponse)
async def add_calendar_event(body: CalendarAddRequest) -> CalendarAddResponse:
    """
    자연어 텍스트 → Gemini 파싱 → 구조화된 일정 → n8n Google Calendar 등록.
    """
    # Step 1 — Gemini로 자연어 파싱
    today = datetime.now().strftime("%Y-%m-%d (%A)")
    try:
        raw = call_gemini(_PARSE_PROMPT.format(today=today, text=body.text))
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end])
        event = CalendarEvent(**data)
    except Exception as exc:
        logger.error("[calendar] Gemini 파싱 실패: %s", exc)
        raise HTTPException(status_code=503, detail=f"일정 파싱 실패: {exc}")

    # Step 2 — n8n Google Calendar 웹훅 호출
    n8n_url = os.getenv("N8N_CALENDAR_WEBHOOK_URL", "").strip()
    if n8n_url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(n8n_url, json={
                    "title": event.title,
                    "date": event.date,
                    "start_time": event.start_time,
                    "end_time": event.end_time,
                    "description": event.description,
                    "location": event.location,
                })
            logger.info("[calendar] n8n 호출 완료: %s %s", event.date, event.title)
        except Exception as exc:
            logger.warning("[calendar] n8n 호출 실패: %s", exc)
            raise HTTPException(status_code=502, detail=f"캘린더 등록 실패: {exc}")
    else:
        logger.warning("[calendar] N8N_CALENDAR_WEBHOOK_URL 미설정")

    return CalendarAddResponse(
        ok=True,
        event=event,
        message=f"{event.date} {event.start_time}에 '{event.title}' 일정이 등록되었습니다.",
    )


@calendar_router.get("/ping")
def ping() -> dict:
    return {"ok": True}
