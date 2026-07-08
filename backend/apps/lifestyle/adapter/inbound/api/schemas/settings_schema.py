"""라이프스타일 API 공용 스키마."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


def normalize_str_list(items: list[str], *, max_items: int = 40, max_len: int = 48) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in items:
        s = (raw or "").strip()[:max_len]
        if not s:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= max_items:
            break
    return out


class FashionPrefs(BaseModel):
    gender_preset: Literal["mens", "womens", "unisex"] = "unisex"
    style_tags: list[str] = Field(default_factory=list)
    temperature_sensitivity: Literal["heat", "cold", "normal"] = "normal"

    @field_validator("style_tags", mode="before")
    @classmethod
    def _cap_styles(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return normalize_str_list([str(x) for x in v], max_items=12, max_len=32)


class MusicPrefs(BaseModel):
    genre_tags: list[str] = Field(default_factory=list)
    mood_tags: list[str] = Field(default_factory=list)

    @field_validator("genre_tags", mode="before")
    @classmethod
    def _cap_genre(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return normalize_str_list([str(x) for x in v], max_items=16, max_len=32)

    @field_validator("mood_tags", mode="before")
    @classmethod
    def _cap_mood(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return normalize_str_list([str(x) for x in v], max_items=16, max_len=32)


class FoodPrefs(BaseModel):
    avoided_ingredients: list[str] = Field(default_factory=list)
    cooking_preference_tags: list[str] = Field(default_factory=list)

    @field_validator("avoided_ingredients", mode="before")
    @classmethod
    def _cap_avoid(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return normalize_str_list([str(x) for x in v], max_items=40, max_len=48)

    @field_validator("cooking_preference_tags", mode="before")
    @classmethod
    def _cap_cook(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return normalize_str_list([str(x) for x in v], max_items=16, max_len=48)


class LifestyleProfile(BaseModel):
    fashion: FashionPrefs = Field(default_factory=FashionPrefs)
    food: FoodPrefs = Field(default_factory=FoodPrefs)
    music: MusicPrefs = Field(default_factory=MusicPrefs)


class UserSettingOut(BaseModel):
    id: int
    user_id: int
    language: str
    preferred_model: str
    lifestyle: LifestyleProfile
    created_at: datetime
    updated_at: datetime


class PatchUserSettingsBody(BaseModel):
    user_id: int = Field(..., description="소유자 검증용")
    language: str | None = Field(default=None, max_length=16)
    preferred_model: str | None = Field(default=None, max_length=64)
    lifestyle: LifestyleProfile | None = None
