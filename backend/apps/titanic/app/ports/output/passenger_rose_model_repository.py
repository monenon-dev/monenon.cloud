from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


from titanic.app.dto.passenger_rose_model_dto import RoseModelQuery, RoseModelResponse


class RoseModelRepository(ABC):
    @abstractmethod
    async def introduce_myself(self, query: RoseModelQuery) -> RoseModelResponse:
        """로즈 모델 자기소개 레포지토리 추상 메소드"""
        ...

    @abstractmethod
    async def get_all_records(self) -> list[dict[str, Any]]:
        """ML 학습용 전체 승객 데이터 조회"""
        ...
