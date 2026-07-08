"""공통 기본 키 — docs/DevOps/backend/ENTITY_RULE.md."""

from __future__ import annotations

from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column


class IntIdPrimaryKeyMixin:
    """시스템 내부용 자동 증감 고유 번호 (기본 키). DB 컬럼명: id."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
