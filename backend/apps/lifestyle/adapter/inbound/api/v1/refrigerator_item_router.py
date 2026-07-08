"""냉장고 식재료(refrigerator_items) CRUD API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from lifestyle.app.composition.providers import get_lifestyle_pg_repository
from lifestyle.adapter.outbound.pg.lifestyle_pg_repository import LifestylePgRepository
from lifestyle.adapter.inbound.api.schemas.refrigerator_schema import (
    RefrigeratorItemBody,
    RefrigeratorItemOut,
    RefrigeratorItemPatchBody,
    refrigerator_item_out,
)
from lifestyle.adapter.outbound.orm.lifestyle_orm import RefrigeratorItem

logger = logging.getLogger(__name__)

refrigerator_item_router = APIRouter(prefix="/platform", tags=["refrigerator-items"])


@refrigerator_item_router.get("/refrigerator/items", response_model=list[RefrigeratorItemOut])
async def list_refrigerator_items(
    user_id: int,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> list[RefrigeratorItemOut]:
    await repo.verify_user(user_id)
    result = await session.execute(
        select(RefrigeratorItem)
        .where(RefrigeratorItem.user_id == user_id)
        .order_by(RefrigeratorItem.id.desc())
    )
    return [refrigerator_item_out(row) for row in result.scalars().all()]


@refrigerator_item_router.post("/refrigerator/items", response_model=RefrigeratorItemOut, status_code=201)
async def create_refrigerator_item(
    body: RefrigeratorItemBody,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> RefrigeratorItemOut:
    await repo.verify_user(body.user_id)
    row = RefrigeratorItem(
        user_id=body.user_id,
        name=body.name.strip(),
        quantity=body.quantity.strip() if body.quantity else None,
        expiry_date=body.expiry_date,
        category=body.category.strip() if body.category else None,
        note=body.note.strip() if body.note else None,
    )
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return refrigerator_item_out(row)


@refrigerator_item_router.patch("/refrigerator/items/{item_id}", response_model=RefrigeratorItemOut)
async def patch_refrigerator_item(
    item_id: int,
    body: RefrigeratorItemPatchBody,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> RefrigeratorItemOut:
    result = await session.execute(
        select(RefrigeratorItem).where(
            RefrigeratorItem.id == item_id,
            RefrigeratorItem.user_id == body.user_id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="냉장고 식재료를 찾을 수 없습니다.")
    if body.name is not None:
        row.name = body.name.strip()
    if body.quantity is not None:
        row.quantity = body.quantity.strip() or None
    await session.flush()
    await session.refresh(row)
    return refrigerator_item_out(row)


@refrigerator_item_router.delete("/refrigerator/items/{item_id}")
async def delete_refrigerator_item(
    item_id: int,
    user_id: int,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> dict:
    result = await session.execute(
        select(RefrigeratorItem).where(
            RefrigeratorItem.id == item_id,
            RefrigeratorItem.user_id == user_id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="냉장고 식재료를 찾을 수 없습니다.")
    await session.delete(row)
    return {"ok": True, "deleted_id": item_id}
