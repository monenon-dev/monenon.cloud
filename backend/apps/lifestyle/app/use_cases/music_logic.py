"""날씨·취향·상황별 음악 추천 (규칙 기반)."""

from __future__ import annotations

from typing import Any

SCENE_META: dict[str, dict[str, str]] = {
    "commute": {"label": "출근길", "emoji": "🚇", "hint": "집중·밝은 기분·이동 중"},
    "outing": {"label": "놀러갈 때", "emoji": "🎉", "hint": "신나는·가벼운·외출"},
    "cooking": {"label": "요리할 때", "emoji": "🍳", "hint": "잔잔한·리듬감·주방"},
}

VALID_SCENES = frozenset(SCENE_META.keys())


def _is_rainy(description: str) -> bool:
    d = (description or "").lower()
    return any(k in d for k in ("비", "rain", "drizzle", "shower", "thunder"))


def _pool_commute(rainy: bool, hot: bool, cool: bool, genres: set[str]) -> list[dict[str, str]]:
    pool: list[dict[str, str]] = []
    if rainy:
        pool.extend(
            [
                {"title": "Rainy Day", "artist": "IU", "reason": "비 오는 출근길 잔잔한 멜로디"},
                {"title": "우산", "artist": "Epik High", "reason": "차분한 힙합으로 집중"},
            ]
        )
    elif hot:
        pool.extend(
            [
                {"title": "Supernova", "artist": "aespa", "reason": "더운 날 에너지 충전"},
                {"title": "Ice Cream", "artist": "BLACKPINK", "reason": "상쾌한 출근 무드"},
            ]
        )
    else:
        pool.extend(
            [
                {"title": "Dynamite", "artist": "BTS", "reason": "아침 출근길 텐션 업"},
                {"title": "Hype Boy", "artist": "NewJeans", "reason": "가볍고 밝은 리듬"},
            ]
        )
    if cool:
        pool.append({"title": "Spring Day", "artist": "BTS", "reason": "선선한 날 감성 출근"})
    if "재즈" in genres or "jazz" in genres:
        pool.append({"title": "Fly Me to the Moon", "artist": "Frank Sinatra", "reason": "재즈 선호"})
    if "클래식" in genres:
        pool.append({"title": "Canon in D", "artist": "Pachelbel", "reason": "차분한 클래식"})
    pool.append({"title": "Blueming", "artist": "IU", "reason": "일상 출근에 무난한 팝"})
    return pool


def _pool_outing(rainy: bool, hot: bool, genres: set[str]) -> list[dict[str, str]]:
    pool: list[dict[str, str]] = []
    if rainy:
        pool.extend(
            [
                {"title": "사건의 지평선", "artist": "윤하", "reason": "실내 모임·카페에 어울림"},
                {"title": "Love poem", "artist": "IU", "reason": "비 오는 날 감성 외출"},
            ]
        )
    else:
        pool.extend(
            [
                {"title": "Queencard", "artist": "(G)I-DLE", "reason": "신나는 외출 무드"},
                {"title": "OMG", "artist": "NewJeans", "reason": "친구들과 놀 때"},
                {"title": "After LIKE", "artist": "IVE", "reason": "밝은 K-pop"},
            ]
        )
    if hot:
        pool.append({"title": "Good Boy", "artist": "GD", "reason": "더운 날 시원한 비트"})
    if "힙합" in genres or "hip" in genres:
        pool.append({"title": "맙소사", "artist": "Dynamic Duo", "reason": "힙합 취향"})
    if "인디" in genres:
        pool.append({"title": "춘천가는 기차", "artist": "Buried Treasure", "reason": "인디 감성"})
    pool.append({"title": "Celebrity", "artist": "아이유", "reason": "누구나 좋아하는 외출곡"})
    return pool


def _pool_cooking(rainy: bool, cool: bool, genres: set[str]) -> list[dict[str, str]]:
    pool: list[dict[str, str]] = []
    if rainy:
        pool.extend(
            [
                {"title": "Lofi Study", "artist": "Chillhop", "reason": "비 오는 주방 lo-fi"},
                {"title": "Sunday Morning", "artist": "Maroon 5", "reason": "느긋한 요리 타임"},
            ]
        )
    else:
        pool.extend(
            [
                {"title": "Banana Shake", "artist": "Chung Ha", "reason": "가벼운 리듬"},
                {"title": "Cooking", "artist": "Zico", "reason": "요리하며 듣기 좋은 비트"},
            ]
        )
    if cool:
        pool.append({"title": "가을방학", "artist": "Busker Busker", "reason": "따뜻한 국물 요리와 잘 맞음"})
    if "재즈" in genres or "jazz" in genres:
        pool.append({"title": "Take Five", "artist": "Dave Brubeck", "reason": "재즈 요리 BGM"})
    if "어쿠스틱" in genres:
        pool.append({"title": "좋은 날", "artist": "아이유", "reason": "어쿠스틱 감성"})
    pool.append({"title": "Kitchen", "artist": "Zion.T", "reason": "잔잔한 R&B 요리"})
    return pool


def _dedupe_tracks(raw: list[dict[str, str]], limit: int = 6) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for t in raw:
        key = f"{t['title']}|{t['artist']}".lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(t)
        if len(out) >= limit:
            break
    return out


def recommend_for_scene(
    scene: str,
    temp_c: float | None,
    description: str,
    genre_tags: list[str],
    mood_tags: list[str],
) -> list[dict[str, str]]:
    """상황별 추천 곡 목록."""
    if scene not in VALID_SCENES:
        return []
    genres = {g.lower() for g in genre_tags}
    for m in mood_tags:
        genres.add(m.lower())
    rainy = _is_rainy(description)
    hot = temp_c is not None and temp_c >= 28
    cool = temp_c is not None and temp_c < 18

    if scene == "commute":
        raw = _pool_commute(rainy, hot, cool, genres)
    elif scene == "outing":
        raw = _pool_outing(rainy, hot, genres)
    else:
        raw = _pool_cooking(rainy, cool, genres)

    if "조용" in mood_tags or "잔잔" in mood_tags:
        if scene == "commute":
            raw.insert(0, {"title": "Through the Night", "artist": "IU", "reason": "잔잔한 무드 선호"})
    if "신나는" in mood_tags and scene == "outing":
        raw.insert(0, {"title": "TOMBOY", "artist": "(G)I-DLE", "reason": "신나는 무드"})

    return _dedupe_tracks(raw)


def build_scene_overviews(
    temp_c: float | None,
    description: str,
    genre_tags: list[str],
    mood_tags: list[str],
) -> dict[str, dict[str, Any]]:
    """출근·외출·요리 세 섹션 추천."""
    scenes: dict[str, dict[str, Any]] = {}
    for key, meta in SCENE_META.items():
        tracks = recommend_for_scene(key, temp_c, description, genre_tags, mood_tags)
        scenes[key] = {
            "key": key,
            "label": meta["label"],
            "emoji": meta["emoji"],
            "hint": meta["hint"],
            "tracks": tracks,
        }
    return scenes
