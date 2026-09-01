"""아침 브리핑 생성 — APScheduler·Cloud Scheduler 공용 진입점."""

from __future__ import annotations

import logging
from typing import Any

from weather_caller import fetch_current_weather

logger = logging.getLogger(__name__)


def _format_briefing(weather: dict[str, Any]) -> str:
    city = weather.get("city") or "Seoul"
    temp = weather.get("temp_c")
    desc = weather.get("description") or ""
    feels = weather.get("feels_like_c")
    lines = [f"☀️ <b>아침 브리핑</b> — {city}"]
    if temp is not None:
        lines.append(f"🌡 기온: {temp}°C (체감 {feels}°C)" if feels is not None else f"🌡 기온: {temp}°C")
    if desc:
        lines.append(f"🌤 날씨: {desc}")
    return "\n".join(lines)


async def run_morning_briefing() -> dict[str, Any]:
    """
    아침 브리핑을 생성하고(필요 시 텔레그램 전송) 결과를 반환합니다.
    Cloud Run에서는 POST /internal/trigger-briefing 으로 호출하세요.
    """
    weather = fetch_current_weather()
    message = _format_briefing(weather)

    telegram_sent = False
    try:
        from telegram_reporter.reporter import send_report

        telegram_sent = await send_report(message)
    except Exception as exc:
        logger.warning("[briefing] telegram 전송 생략: %s", exc)

    logger.info("[briefing] generated | city=%s telegram=%s", weather.get("city"), telegram_sent)
    return {
        "ok": True,
        "briefing": message,
        "weather": weather,
        "telegram_sent": telegram_sent,
    }
