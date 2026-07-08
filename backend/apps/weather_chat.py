"""채팅 메시지에서 날씨 질문을 감지하고 OpenWeather로 답합니다."""

from __future__ import annotations

import re
from typing import Any

from weather_caller import fetch_current_weather

_WEATHER_HINT = re.compile(
    r"날씨|weather|기온|온도|습도|맑음|맑아|흐림|흐려|비\s*오|눈\s*오|우산|미세먼지",
    re.IGNORECASE,
)

# 날씨 수치만 알려달라는 질문 vs 옷 추천·한마디 등 대화형 요청 구분
_ACTION_INTENT = re.compile(
    r"추천|옷|차림|입어|코디|한마디|위로|응원|격려|말해|요리|레시피|재료|만들|파먹|기분|조언|농담|시\s*한",
    re.IGNORECASE,
)

_WEATHER_ADVICE_HINT = re.compile(
    r"옷|차림|코디|우산|외출|비\s*오는\s*날|장마",
    re.IGNORECASE,
)

# 한글·영문 도시 → OpenWeather `q` 파라미터
_CITY_ALIASES: dict[str, str] = {
    "서울": "Seoul",
    "부산": "Busan",
    "인천": "Incheon",
    "대구": "Daegu",
    "대전": "Daejeon",
    "광주": "Gwangju",
    "울산": "Ulsan",
    "수원": "Suwon",
    "제주": "Jeju",
    "부천": "Bucheon",
    "창원": "Changwon",
    "고양": "Goyang",
    "용인": "Yongin",
    "성남": "Seongnam",
    "청주": "Cheongju",
    "전주": "Jeonju",
    "천안": "Cheonan",
    "안산": "Ansan",
    "김해": "Gimhae",
    "포항": "Pohang",
    "seoul": "Seoul",
    "busan": "Busan",
    "incheon": "Incheon",
    "daegu": "Daegu",
    "daejeon": "Daejeon",
    "gwangju": "Gwangju",
    "jeju": "Jeju",
    "tokyo": "Tokyo",
    "osaka": "Osaka",
    "new york": "New York",
    "london": "London",
    "paris": "Paris",
}


def is_weather_query(text: str) -> bool:
    return bool(_WEATHER_HINT.search((text or "").strip()))


def is_direct_weather_lookup(text: str) -> bool:
    """날씨 정보만 요청하는 짧은 질문 (OpenWeather 직접 응답)."""
    msg = (text or "").strip()
    if not is_weather_query(msg):
        return False
    if _ACTION_INTENT.search(msg):
        return False
    return True


def should_attach_weather_context(text: str) -> bool:
    """Gemini 답변에 실시간 날씨를 붙일지 여부."""
    msg = (text or "").strip()
    return bool(is_weather_query(msg) or _WEATHER_ADVICE_HINT.search(msg))


def extract_city_query(text: str) -> str | None:
    """메시지에서 도시 추출. 없으면 None → Keymaker 기본 도시."""
    msg = (text or "").strip()
    for alias, city_en in sorted(_CITY_ALIASES.items(), key=lambda x: -len(x[0])):
        if alias in msg or alias.lower() in msg.lower():
            return city_en
    m = re.search(
        r"(?:in|at|의|에서)\s*['\"]?([A-Za-z가-힣\s]{2,20})['\"]?\s*(?:날씨|weather|기온)?",
        msg,
        re.IGNORECASE,
    )
    if m:
        name = m.group(1).strip()
        if name in _CITY_ALIASES:
            return _CITY_ALIASES[name]
        if re.fullmatch(r"[A-Za-z\s]+", name):
            return name
    return None


def is_rainy_weather(data: dict[str, Any]) -> bool:
    """OpenWeather 응답으로 비·흐림(강수) 여부 판단."""
    desc = (data.get("description") or "").lower()
    icon = (data.get("icon") or "")
    if re.search(r"비|소나기|이슬비|drizzle|rain|shower|천둥", desc, re.IGNORECASE):
        return True
    return icon.startswith(("09", "10", "11"))


def is_mood_one_liner_request(text: str) -> bool:
    """오늘의 한마디·비 오는 날 위로 등 기분 한마디 요청."""
    msg = (text or "").strip()
    return bool(
        re.search(r"한마디|위로|응원|격려|기분", msg, re.IGNORECASE)
        or re.search(r"비\s*오는\s*날|장마", msg, re.IGNORECASE)
    )


def format_weather_reply(data: dict[str, Any]) -> str:
    city = data.get("city") or ""
    country = data.get("country")
    loc = f"{city} ({country})" if country else city
    temp = data.get("temp_c")
    feels = data.get("feels_like_c")
    desc = data.get("description") or ""
    humidity = data.get("humidity")
    wind = data.get("wind_mps")

    lines = [f"{loc}의 현재 날씨입니다.", ""]
    if isinstance(temp, (int, float)):
        line = f"• 기온: {round(temp)}°C"
        if isinstance(feels, (int, float)):
            line += f" (체감 {round(feels)}°C)"
        lines.append(line)
    if desc:
        lines.append(f"• 날씨: {desc}")
    if humidity is not None:
        lines.append(f"• 습도: {humidity}%")
    if isinstance(wind, (int, float)):
        lines.append(f"• 풍속: {wind} m/s")
    lines.append("")
    lines.append("(OpenWeather 실시간 데이터)")
    return "\n".join(lines)


def try_weather_chat_reply(message: str) -> tuple[str, str] | None:
    """
    순수 날씨 조회 질문이면 (model_id, reply) 반환.
    옷 추천·한마디 등은 None → Gemini가 날씨 맥락과 함께 답변.
    """
    if not is_direct_weather_lookup(message):
        return None

    city = extract_city_query(message)
    try:
        data = fetch_current_weather(city)
        return ("openweather", format_weather_reply(data))
    except ValueError as e:
        return ("openweather", str(e))
    except RuntimeError as e:
        return ("openweather", f"날씨 정보를 가져오지 못했습니다. {e}")


def augment_message_with_weather(message: str) -> str:
    """
    대화형 질문에 OpenWeather 스냅샷을 붙여 Gemini 프롬프트로 확장.
    날씨 API 실패 시 원문 그대로 반환.
    """
    msg = (message or "").strip()
    if not msg or not should_attach_weather_context(msg):
        return msg

    city = extract_city_query(msg)
    try:
        data = fetch_current_weather(city)
        block = format_weather_reply(data)
    except (ValueError, RuntimeError) as e:
        return (
            f"{msg}\n\n"
            f"[참고: 현재 날씨 데이터를 가져오지 못했습니다 — {e}]\n"
            "가능한 범위에서 사용자 질문에 답변해 주세요."
        )

    if is_mood_one_liner_request(msg):
        rainy = is_rainy_weather(data)
        if rainy:
            user_intent = (
                "지금은 비가 오거나 궂은 날씨입니다. "
                "이 날씨에 어울리는, 기분이 조금 나아지는 위로 한마디를 해 주세요."
            )
            tail = (
                "위 날씨를 반영해 비 오는 날에 어울리는 따뜻하거나 가벼운 유머의 한두 문장만 답하세요. "
                "날씨 수치는 나열하지 마세요. 뻔한 클리셰는 피하고 매번 다른 표현을 쓰세요."
            )
        else:
            user_intent = (
                "지금은 비가 오지 않고 날씨가 괜찮거나 좋은 편입니다. "
                "오늘 하루를 응원하는 밝은 한마디를 해 주세요."
            )
            tail = (
                "위 날씨를 반영해 맑은 날에 어울리는 응원·격려 한두 문장만 답하세요. "
                "비, 우울, 장마 같은 표현은 쓰지 마세요. 날씨 수치는 나열하지 마세요. "
                "매번 다른 표현을 사용하세요."
            )
        return f"{user_intent}\n\n[참고: 현재 날씨 데이터]\n{block}\n\n{tail}"

    tail = (
        "위 날씨 정보를 참고하여 사용자 질문에 자연스럽게 답변해 주세요. "
        "기온·습도 등 수치만 나열하지 말고, 질문 의도에 맞는 내용을 포함하세요."
    )
    if re.search(r"추천|옷|차림|코디", msg):
        tail += " 오늘 입을 옷·소지품을 구체적으로 항목별로 추천하세요."

    return f"{msg}\n\n[참고: 현재 날씨 데이터]\n{block}\n\n{tail}"
