"""음악 API 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field

from lifestyle.adapter.outbound.orm.lifestyle_orm import MusicItem


class MusicPrefsOut(BaseModel):
    genre_tags: list[str] = []
    mood_tags: list[str] = []


class TrackOut(BaseModel):
    title: str
    artist: str
    reason: str


class SceneOut(BaseModel):
    key: str
    label: str
    emoji: str
    hint: str
    tracks: list[TrackOut]


class MusicItemOut(BaseModel):
    id: int
    user_id: int
    title: str
    artist: str | None = None
    scene: str
    note: str | None = None


class MusicItemBody(BaseModel):
    user_id: int
    title: str = Field(..., min_length=1, max_length=128)
    artist: str | None = Field(default=None, max_length=64)
    scene: str = Field(default="commute", pattern="^(commute|outing|cooking)$")
    note: str | None = Field(default=None, max_length=128)


class MusicOverviewOut(BaseModel):
    weather: dict
    prefs: MusicPrefsOut
    scenes: dict[str, SceneOut]
    saved_by_scene: dict[str, list[MusicItemOut]]
    summary: str


class MusicPrefsBody(BaseModel):
    user_id: int
    genre_tags: list[str] | None = None
    mood_tags: list[str] | None = None


def music_item_out(row: MusicItem) -> MusicItemOut:
    return MusicItemOut(
        id=row.id,
        user_id=row.user_id,
        title=row.title,
        artist=row.artist,
        scene=row.scene,
        note=row.note,
    )
