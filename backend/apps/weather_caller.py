"""OpenWeather Current Weather API — 키는 Keymaker, 호출은 이 모듈."""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import urlopen

from core.matrix.vault_keymaker_secret_manager import get_keymaker

OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5/weather"


def fetch_current_weather(city: str | None = None) -> dict[str, Any]:
    """
    도시 현재 날씨. OpenWeather 2.5 current weather.
    반환: 프론트 표시용으로 정리한 dict.
    """
    km = get_keymaker()
    api_key = km.openweather_api_key()
    if not api_key:
        raise RuntimeError(
            "OPENWEATHER_API_KEY 또는 openweather_api_key 를 .env에 설정하세요."
        )

    q = (city or km.openweather_default_city()).strip()
    if not q:
        raise ValueError("도시 이름이 비었습니다.")

    url = (
        f"{OPENWEATHER_BASE}?q={quote(q)}"
        f"&appid={quote(api_key)}&units=metric&lang=kr"
    )

    try:
        with urlopen(url, timeout=12) as resp:
            raw = json.loads(resp.read().decode())
    except HTTPError as e:
        body = ""
        try:
            body = e.read().decode()
        except OSError:
            pass
        if e.code == 404:
            raise ValueError(f"도시를 찾을 수 없습니다: {q}") from e
        if e.code == 401:
            raise RuntimeError("OpenWeather API 키가 올바르지 않습니다.") from e
        raise RuntimeError(f"OpenWeather 오류 ({e.code}): {body or e.reason}") from e
    except URLError as e:
        raise RuntimeError(f"OpenWeather 연결 실패: {e.reason}") from e

    weather_list = raw.get("weather") or [{}]
    w0 = weather_list[0] if weather_list else {}
    main = raw.get("main") or {}
    wind = raw.get("wind") or {}
    sys_info = raw.get("sys") or {}
    icon = w0.get("icon") or "01d"

    return {
        "city": raw.get("name") or q,
        "country": sys_info.get("country"),
        "temp_c": main.get("temp"),
        "feels_like_c": main.get("feels_like"),
        "humidity": main.get("humidity"),
        "description": w0.get("description") or "",
        "icon": icon,
        "icon_url": f"https://openweathermap.org/img/wn/{icon}@2x.png",
        "wind_mps": wind.get("speed"),
    }
