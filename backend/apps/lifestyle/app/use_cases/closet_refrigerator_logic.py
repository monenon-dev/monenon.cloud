"""날씨·선호도 기반 옷장·냉장고 추천 (규칙 기반)."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any


def _effective_temp(temp_c: float | None, sensitivity: str) -> float | None:
    if temp_c is None:
        return None
    t = float(temp_c)
    if sensitivity == "cold":
        t += 3.0
    elif sensitivity == "heat":
        t -= 2.0
    return t


def _is_rainy(description: str) -> bool:
    d = (description or "").lower()
    return any(k in d for k in ("비", "rain", "drizzle", "shower", "thunder"))


def _warmth_for_temp(effective: float) -> str:
    if effective < 8:
        return "heavy"
    if effective < 18:
        return "mid"
    return "light"


def default_outfit_pieces(effective: float | None, rainy: bool, style_tags: list[str]) -> list[dict[str, str]]:
    """등록 옷이 없을 때 보여줄 추천 코디 템플릿."""
    if effective is None:
        effective = 15.0
    pieces: list[dict[str, str]] = []
    if rainy:
        pieces.append({"name": "방수 재킷 또는 우산", "category": "outer", "reason": "비 예보"})
    if effective < 5:
        pieces.extend(
            [
                {"name": "두꺼운 코트", "category": "outer", "reason": "한파·강추위"},
                {"name": "니트·목도리", "category": "top", "reason": "보온"},
                {"name": "기모/울 바지", "category": "bottom", "reason": "하체 보온"},
            ]
        )
    elif effective < 12:
        pieces.extend(
            [
                {"name": "자켓·코트", "category": "outer", "reason": "쌀쌀한 날씨"},
                {"name": "맨투맨·니트", "category": "top", "reason": "레이어드"},
                {"name": "긴바지", "category": "bottom", "reason": "기온 대비"},
            ]
        )
    elif effective < 22:
        pieces.extend(
            [
                {"name": "가디건·얇은 자켓", "category": "outer", "reason": "선선함"},
                {"name": "셔츠·블라우스", "category": "top", "reason": "쾌적 온도"},
                {"name": "데님·슬랙스", "category": "bottom", "reason": "일상"},
            ]
        )
    else:
        pieces.extend(
            [
                {"name": "반팔·민소매", "category": "top", "reason": "더운 날씨"},
                {"name": "반바지·린넨 팬츠", "category": "bottom", "reason": "통풍"},
                {"name": "선글라스·모자", "category": "acc", "reason": "자외선"},
            ]
        )
    if "office" in style_tags:
        pieces.append({"name": "깔끔한 구두·셔츠", "category": "acc", "reason": "오피스룩 선호"})
    if "minimal" in style_tags and pieces:
        pieces = pieces[:4]
    return pieces


def match_closet_items(
    items: list[dict[str, Any]],
    effective: float | None,
    rainy: bool,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """(오늘 추천에 맞는 등록 옷, 그 외) 분류."""
    if effective is None:
        return [], items
    target = _warmth_for_temp(effective)
    warmth_order = {"light": 0, "mid": 1, "heavy": 2}
    target_i = warmth_order.get(target, 1)

    recommended: list[dict[str, Any]] = []
    other: list[dict[str, Any]] = []
    for it in items:
        w = it.get("warmth") or "mid"
        wi = warmth_order.get(w, 1)
        cat = it.get("category") or "top"
        match = abs(wi - target_i) <= 1
        if rainy and cat == "outer":
            match = True
        if match:
            rec = {**it, "match_reason": _item_match_reason(w, target, rainy, cat)}
            recommended.append(rec)
        else:
            other.append(it)
    return recommended, other


def _item_match_reason(warmth: str, target: str, rainy: bool, category: str) -> str:
    if rainy and category == "outer":
        return "비·외투"
    labels = {"light": "얇은 옷", "mid": "중간 두께", "heavy": "두꺼운 옷"}
    return f"오늘 기온에 맞는 {labels.get(target, '옷')}"


def weather_food_suggestions(
    temp_c: float | None,
    description: str,
    cooking_tags: list[str],
    avoided: list[str],
) -> list[dict[str, str]]:
    """날씨·선호에 맞는 음식 추천."""
    avoided_lower = {a.lower() for a in avoided}
    raw: list[dict[str, str]] = []
    rainy = _is_rainy(description)
    hot = temp_c is not None and temp_c >= 28
    warm = temp_c is not None and 22 <= temp_c < 28
    cool = temp_c is not None and 10 <= temp_c < 18
    cold = temp_c is not None and temp_c < 10

    if hot:
        raw.extend(
            [
                {"name": "냉면·비빔국수", "reason": "더위에 시원한 면 요리"},
                {"name": "수박·과일 샐러드", "reason": "수분·당 보충"},
                {"name": "콩국·냉채", "reason": "가볍고 시원함"},
            ]
        )
    elif warm:
        raw.extend(
            [
                {"name": "닭가슴살 샐러드", "reason": "가볍고 든든함"},
                {"name": "김치볶음밥", "reason": "한 그릇 메뉴"},
            ]
        )
    elif cold or cool:
        raw.extend(
            [
                {"name": "김치찌개·된장찌개", "reason": "따뜻한 국물"},
                {"name": "닭죽·전골", "reason": "체온 유지"},
                {"name": "구운 고구마", "reason": "간식·포만감"},
            ]
        )
    if rainy:
        raw.extend(
            [
                {"name": "부침개·전", "reason": "비 오는 날 안주·한식"},
                {"name": "라면·우동", "reason": "간편한 국물"},
            ]
        )
    if "한식 위주" in cooking_tags:
        raw.append({"name": "제철 나물·밑반찬", "reason": "한식 선호"})
    if "다이어트·식단 관리" in cooking_tags:
        raw.append({"name": "닭·두부·채소 볶음", "reason": "식단 관리"})
    if "자취 초간단 요리" in cooking_tags:
        raw.append({"name": "계란프라이·즉석밥", "reason": "간단 조리"})

    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in raw:
        name = item["name"]
        if any(a in name.lower() for a in avoided_lower):
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    if not out:
        out.append({"name": "제철 채소 위주 한 끼", "reason": "선호 재료를 확인해 주세요"})
    return out[:8]


def preferred_food_ideas(cooking_tags: list[str], avoided: list[str]) -> list[str]:
    """선호 태그 기반 메뉴 아이디어."""
    ideas: list[str] = []
    if "한식 위주" in cooking_tags:
        ideas.extend(["비빔밥", "불고기", "된장국"])
    if "양식 선호" in cooking_tags:
        ideas.extend(["파스타", "샐러드", "스테이크"])
    if "국물 요리" in cooking_tags:
        ideas.extend(["찌개", "탕", "전골"])
    if "볶음·한 판 요리" in cooking_tags:
        ideas.extend(["볶음밥", "제육볶음"])
    if not ideas:
        ideas = ["집밥 한 끼", "간단 반찬 2가지"]
    avoided_lower = {a.lower() for a in avoided}
    return [i for i in ideas if not any(a in i.lower() for a in avoided_lower)][:6]


def expiry_status(expiry: date | None, today: date | None = None) -> str | None:
    if expiry is None:
        return None
    t = today or date.today()
    delta = (expiry - t).days
    if delta < 0:
        return "expired"
    if delta <= 3:
        return "urgent"
    if delta <= 7:
        return "soon"
    return "ok"
