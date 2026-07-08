"""옷장(closet) 개요·추천 API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from lifestyle.app.composition.providers import get_lifestyle_pg_repository
from lifestyle.adapter.outbound.pg.lifestyle_pg_repository import LifestylePgRepository
from lifestyle.adapter.inbound.api.schemas.closet_schema import ClosetItemOut, ClosetOverviewOut, closet_item_to_dict
from lifestyle.adapter.inbound.api.schemas.settings_schema import FashionPrefs
from lifestyle.adapter.outbound.orm.lifestyle_orm import ClosetItem
from lifestyle.app.use_cases.closet_refrigerator_logic import (
    _effective_temp,
    _is_rainy,
    default_outfit_pieces,
    match_closet_items,
)
from weather_caller import fetch_current_weather

logger = logging.getLogger(__name__)

closet_router = APIRouter(prefix="/platform", tags=["closet"])


@closet_router.get("/closet/overview", response_model=ClosetOverviewOut)
async def closet_overview(
    user_id: int,
    city: str | None = None,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> ClosetOverviewOut:
    await repo.verify_user(user_id)
    closet_prefs = await repo.get_or_create_closet(user_id)
    try:
        weather = fetch_current_weather(city)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    result = await session.execute(
        select(ClosetItem).where(ClosetItem.user_id == user_id).order_by(ClosetItem.id.desc())
    )
    items = [closet_item_to_dict(r) for r in result.scalars().all()]
    temp = weather.get("temp_c")
    desc = weather.get("description") or ""
    eff = _effective_temp(temp if isinstance(temp, (int, float)) else None, closet_prefs.temperature_sensitivity)
    rainy = _is_rainy(desc)
    style_tags = list(closet_prefs.style_tags or [])

    recommended_raw, other_raw = match_closet_items(items, eff, rainy)
    suggested = default_outfit_pieces(eff, rainy, style_tags)

    if not recommended_raw and items:
        recommended_raw = items[:6]
        other_raw = items[6:]

    prefs = FashionPrefs(
        gender_preset=closet_prefs.gender_preset,  # type: ignore[arg-type]
        style_tags=style_tags,
        temperature_sensitivity=closet_prefs.temperature_sensitivity,  # type: ignore[arg-type]
    )

    summary_parts = []
    if isinstance(temp, (int, float)):
        summary_parts.append(f"현재 기온 {round(temp)}°C")
    if desc:
        summary_parts.append(desc)
    if recommended_raw:
        summary_parts.append(f"등록 옷 {len(recommended_raw)}벌 추천")
    else:
        summary_parts.append("날씨 코디를 참고하고 옷을 등록해 보세요.")

    return ClosetOverviewOut(
        weather=weather,
        prefs=prefs,
        recommended_items=[ClosetItemOut(**x) for x in recommended_raw],
        other_items=[ClosetItemOut(**{k: v for k, v in x.items() if k != "match_reason"}) for x in other_raw],
        suggested_outfit=suggested,
        summary=" · ".join(summary_parts),
    )
