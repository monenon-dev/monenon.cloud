"""냉장고 API 스키마."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from lifestyle.adapter.inbound.api.schemas.settings_schema import FoodPrefs
from lifestyle.adapter.outbound.orm.lifestyle_orm import RefrigeratorItem
from lifestyle.app.use_cases.closet_refrigerator_logic import expiry_status


class RefrigeratorItemOut(BaseModel):
    id: int
    user_id: int
    name: str
    quantity: str | None = None
    expiry_date: date | None = None
    category: str | None = None
    note: str | None = None
    expiry_status: str | None = None
    days_until_expiry: int | None = None


class RefrigeratorItemBody(BaseModel):
    user_id: int
    name: str = Field(..., min_length=1, max_length=64)
    quantity: str | None = Field(default=None, max_length=32)
    expiry_date: date | None = None
    category: str | None = Field(default=None, max_length=32)
    note: str | None = Field(default=None, max_length=128)


class RefrigeratorItemPatchBody(BaseModel):
    user_id: int
    quantity: str | None = Field(default=None, max_length=32)
    name: str | None = Field(default=None, max_length=64)


class RefrigeratorOverviewOut(BaseModel):
    weather: dict
    prefs: FoodPrefs
    items: list[RefrigeratorItemOut]
    expiring_soon: list[RefrigeratorItemOut]
    weather_foods: list[dict[str, str]]
    preferred_foods: list[str]
    summary: str


def refrigerator_item_out(row: RefrigeratorItem) -> RefrigeratorItemOut:
    status = expiry_status(row.expiry_date)
    days = None
    if row.expiry_date:
        days = (row.expiry_date - date.today()).days
    return RefrigeratorItemOut(
        id=row.id,
        user_id=row.user_id,
        name=row.name,
        quantity=row.quantity,
        expiry_date=row.expiry_date,
        category=row.category,
        note=row.note,
        expiry_status=status,
        days_until_expiry=days,
    )
