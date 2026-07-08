"""냉장고(refrigerator) 개요·추천 API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from lifestyle.app.composition.providers import get_lifestyle_pg_repository
from lifestyle.adapter.outbound.pg.lifestyle_pg_repository import LifestylePgRepository
from lifestyle.adapter.inbound.api.schemas.refrigerator_schema import RefrigeratorOverviewOut, refrigerator_item_out
from lifestyle.adapter.inbound.api.schemas.settings_schema import FoodPrefs
from lifestyle.adapter.outbound.orm.lifestyle_orm import RefrigeratorItem
from lifestyle.app.use_cases.closet_refrigerator_logic import preferred_food_ideas, weather_food_suggestions
from weather_caller import fetch_current_weather

logger = logging.getLogger(__name__)

refrigerator_router = APIRouter(prefix="/platform", tags=["refrigerator"])


@refrigerator_router.get("/refrigerator/overview", response_model=RefrigeratorOverviewOut)
async def refrigerator_overview(
    user_id: int,
    city: str | None = None,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> RefrigeratorOverviewOut:
    await repo.verify_user(user_id)
    fridge_prefs = await repo.get_or_create_refrigerator(user_id)
    try:
        weather = fetch_current_weather(city)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    result = await session.execute(
        select(RefrigeratorItem)
        .where(RefrigeratorItem.user_id == user_id)
        .order_by(RefrigeratorItem.expiry_date.asc().nulls_last(), RefrigeratorItem.id.desc())
    )
    rows = list(result.scalars().all())
    items = [refrigerator_item_out(r) for r in rows]
    expiring = [i for i in items if i.expiry_status in ("urgent", "soon", "expired")]

    cooking = list(fridge_prefs.cooking_preference_tags or [])
    avoided = list(fridge_prefs.avoided_ingredients or [])
    temp = weather.get("temp_c")
    temp_f = float(temp) if isinstance(temp, (int, float)) else None

    prefs = FoodPrefs(avoided_ingredients=avoided, cooking_preference_tags=cooking)
    weather_foods = weather_food_suggestions(temp_f, weather.get("description") or "", cooking, avoided)
    preferred = preferred_food_ideas(cooking, avoided)

    summary = f"보관 {len(items)}개"
    if expiring:
        summary += f" · 유통기한 임박 {len(expiring)}개"
    if weather_foods:
        summary += f" · 오늘 추천 메뉴 {len(weather_foods)}가지"

    return RefrigeratorOverviewOut(
        weather=weather,
        prefs=prefs,
        items=items,
        expiring_soon=expiring,
        weather_foods=weather_foods,
        preferred_foods=preferred,
        summary=summary,
    )
