"""옷장 아이템(closet_items) CRUD API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from lifestyle.app.composition.providers import get_lifestyle_pg_repository
from lifestyle.adapter.outbound.pg.lifestyle_pg_repository import LifestylePgRepository
from lifestyle.adapter.inbound.api.schemas.closet_schema import ClosetItemBody, ClosetItemOut, closet_item_to_dict
from lifestyle.adapter.outbound.orm.lifestyle_orm import ClosetItem

logger = logging.getLogger(__name__)

closet_item_router = APIRouter(prefix="/platform", tags=["closet-items"])


@closet_item_router.get("/closet/items", response_model=list[ClosetItemOut])
async def list_closet_items(
    user_id: int,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> list[ClosetItemOut]:
    await repo.verify_user(user_id)
    result = await session.execute(
        select(ClosetItem).where(ClosetItem.user_id == user_id).order_by(ClosetItem.id.desc())
    )
    return [ClosetItemOut(**closet_item_to_dict(r)) for r in result.scalars().all()]


@closet_item_router.post("/closet/items", response_model=ClosetItemOut, status_code=201)
async def create_closet_item(
    body: ClosetItemBody,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> ClosetItemOut:
    await repo.verify_user(body.user_id)
    row = ClosetItem(
        user_id=body.user_id,
        name=body.name.strip(),
        category=body.category.strip() or "top",
        warmth=body.warmth,
        color=body.color.strip() if body.color else None,
        note=body.note.strip() if body.note else None,
    )
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return ClosetItemOut(**closet_item_to_dict(row))


@closet_item_router.delete("/closet/items/{item_id}")
async def delete_closet_item(
    item_id: int,
    user_id: int,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> dict:
    result = await session.execute(
        select(ClosetItem).where(ClosetItem.id == item_id, ClosetItem.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="옷장 아이템을 찾을 수 없습니다.")
    await session.delete(row)
    return {"ok": True, "deleted_id": item_id}
