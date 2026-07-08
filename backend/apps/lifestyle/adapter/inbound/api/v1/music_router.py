"""음악(music) 개요·선호도 API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from lifestyle.app.composition.providers import get_lifestyle_pg_repository
from lifestyle.adapter.outbound.pg.lifestyle_pg_repository import LifestylePgRepository
from lifestyle.adapter.inbound.api.schemas.music_schema import (
    MusicItemOut,
    MusicOverviewOut,
    MusicPrefsBody,
    MusicPrefsOut,
    SceneOut,
    TrackOut,
    music_item_out,
)
from lifestyle.adapter.outbound.orm.lifestyle_orm import MusicItem
from lifestyle.app.use_cases.music_logic import SCENE_META, VALID_SCENES, build_scene_overviews
from weather_caller import fetch_current_weather

logger = logging.getLogger(__name__)

music_router = APIRouter(prefix="/platform", tags=["music"])


@music_router.get("/music/overview", response_model=MusicOverviewOut)
async def music_overview(
    user_id: int,
    city: str | None = None,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> MusicOverviewOut:
    await repo.verify_user(user_id)
    music_prefs = await repo.get_or_create_music(user_id)
    try:
        weather = fetch_current_weather(city)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    genre_tags = list(music_prefs.genre_tags or [])
    mood_tags = list(music_prefs.mood_tags or [])
    temp = weather.get("temp_c")
    temp_f = float(temp) if isinstance(temp, (int, float)) else None
    desc = weather.get("description") or ""

    raw_scenes = build_scene_overviews(temp_f, desc, genre_tags, mood_tags)
    scenes = {
        k: SceneOut(
            key=v["key"],
            label=v["label"],
            emoji=v["emoji"],
            hint=v["hint"],
            tracks=[TrackOut(**t) for t in v["tracks"]],
        )
        for k, v in raw_scenes.items()
    }

    result = await session.execute(
        select(MusicItem)
        .where(MusicItem.user_id == user_id)
        .order_by(MusicItem.scene, MusicItem.id.desc())
    )
    rows = list(result.scalars().all())
    saved_by_scene: dict[str, list[MusicItemOut]] = {s: [] for s in VALID_SCENES}
    for row in rows:
        if row.scene in saved_by_scene:
            saved_by_scene[row.scene].append(music_item_out(row))

    saved_count = sum(len(v) for v in saved_by_scene.values())
    summary = f"오늘 {len(SCENE_META)}가지 상황별 추천"
    if saved_count:
        summary += f" · 저장곡 {saved_count}곡"

    return MusicOverviewOut(
        weather=weather,
        prefs=MusicPrefsOut(genre_tags=genre_tags, mood_tags=mood_tags),
        scenes=scenes,
        saved_by_scene=saved_by_scene,
        summary=summary,
    )


@music_router.put("/music/prefs", response_model=MusicPrefsOut)
async def put_music_prefs(
    body: MusicPrefsBody,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> MusicPrefsOut:
    await repo.verify_user(body.user_id)
    row = await repo.get_or_create_music(body.user_id)
    if body.genre_tags is not None:
        row.genre_tags = body.genre_tags
    if body.mood_tags is not None:
        row.mood_tags = body.mood_tags
    await session.flush()
    await session.refresh(row)
    return MusicPrefsOut(
        genre_tags=list(row.genre_tags or []),
        mood_tags=list(row.mood_tags or []),
    )
