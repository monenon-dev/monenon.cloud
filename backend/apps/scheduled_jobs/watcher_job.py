"""상황 감지 watcher — APScheduler·Cloud Scheduler 공용 진입점."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def run_situation_watcher_check() -> dict[str, Any]:
    """
    30분 주기 상황 감지 체크.
    Cloud Run에서는 POST /internal/trigger-watcher 로 호출하세요.
    """
    alerts: list[dict[str, str]] = []

    try:
        from weather_caller import fetch_current_weather

        weather = fetch_current_weather()
        temp = weather.get("temp_c")
        if isinstance(temp, (int, float)) and (temp >= 33 or temp <= -10):
            alerts.append(
                {
                    "type": "weather_extreme",
                    "message": f"기온 이상 감지: {temp}°C ({weather.get('city', '')})",
                }
            )
    except Exception as exc:
        logger.warning("[watcher] weather check skipped: %s", exc)

    logger.info("[watcher] check complete | alerts=%s", len(alerts))
    return {"ok": True, "alerts": alerts, "alert_count": len(alerts)}
