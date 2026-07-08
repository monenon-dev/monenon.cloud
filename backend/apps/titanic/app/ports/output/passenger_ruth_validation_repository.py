from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


from titanic.app.dto.passenger_ruth_validation_dto import RuthValidationQuery, RuthValidationResponse


class RuthValidationRepository(ABC):
    @abstractmethod
    async def introduce_myself(self, query: RuthValidationQuery) -> RuthValidationResponse:
        """루스 검증 자기소개 레포지토리 추상 메소드"""
        ...

    @abstractmethod
    async def list_by_pclass(
        self, pclass: int, page: int, page_size: int
    ) -> tuple[int, list[dict[str, Any]]]:
        """등급별 승객 목록 페이지네이션 조회"""
        ...
