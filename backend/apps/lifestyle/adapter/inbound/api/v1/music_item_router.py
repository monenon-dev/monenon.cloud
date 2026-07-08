"""음악 아이템(music_items) CRUD API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from lifestyle.app.composition.providers import get_lifestyle_pg_repository
from lifestyle.adapter.outbound.pg.lifestyle_pg_repository import LifestylePgRepository
from lifestyle.adapter.inbound.api.schemas.music_schema import MusicItemBody, MusicItemOut, music_item_out
from lifestyle.adapter.outbound.orm.lifestyle_orm import MusicItem

logger = logging.getLogger(__name__)

music_item_router = APIRouter(prefix="/platform", tags=["music-items"])


@music_item_router.post("/music/items", response_model=MusicItemOut, status_code=201)
async def create_music_item(
    body: MusicItemBody,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> MusicItemOut:
    await repo.verify_user(body.user_id)
    row = MusicItem(
        user_id=body.user_id,
        title=body.title.strip(),
        artist=body.artist.strip() if body.artist else None,
        scene=body.scene,
        note=body.note.strip() if body.note else None,
    )
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return music_item_out(row)


@music_item_router.delete("/music/items/{item_id}")
async def delete_music_item(
    item_id: int,
    user_id: int,
    session: AsyncSession = Depends(get_db),
    repo: LifestylePgRepository = Depends(get_lifestyle_pg_repository),
) -> dict:
    result = await session.execute(
        select(MusicItem).where(MusicItem.id == item_id, MusicItem.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="음악 아이템을 찾을 수 없습니다.")
    await session.delete(row)
    return {"ok": True, "deleted_id": item_id}
