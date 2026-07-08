"""옷장 API 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field

from lifestyle.adapter.inbound.api.schemas.settings_schema import FashionPrefs
from lifestyle.adapter.outbound.orm.lifestyle_orm import ClosetItem


class ClosetItemOut(BaseModel):
    id: int
    user_id: int
    name: str
    category: str
    warmth: str
    color: str | None = None
    note: str | None = None
    match_reason: str | None = None


class ClosetItemBody(BaseModel):
    user_id: int
    name: str = Field(..., min_length=1, max_length=64)
    category: str = Field(default="top", max_length=32)
    warmth: str = Field(default="mid", pattern="^(light|mid|heavy)$")
    color: str | None = Field(default=None, max_length=32)
    note: str | None = Field(default=None, max_length=128)


class ClosetOverviewOut(BaseModel):
    weather: dict
    prefs: FashionPrefs
    recommended_items: list[ClosetItemOut]
    other_items: list[ClosetItemOut]
    suggested_outfit: list[dict[str, str]]
    summary: str


def closet_item_to_dict(row: ClosetItem) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "name": row.name,
        "category": row.category,
        "warmth": row.warmth,
        "color": row.color,
        "note": row.note,
    }
