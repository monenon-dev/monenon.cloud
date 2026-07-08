from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter


@dataclass(frozen=True)
class CharacterNode:
    """캐릭터 하나 = 헥사고날 미니 트리 (동일 패턴 반복)."""

    slug: str
    group: str
    prefix: str
    display_name: str
    router: APIRouter
    get_repository: Callable[..., Any]
    get_use_case: Callable[..., Any]
