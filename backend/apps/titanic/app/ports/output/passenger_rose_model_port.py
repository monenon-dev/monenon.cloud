from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from titanic.app.dtos.passenger_rose_model_dto import RoseModelQuery, RoseModelResponse


class RoseModelPort(ABC):

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @abstractmethod
    def fit(self, X: Any, y: Any) -> None:
        pass

    @abstractmethod
    def predict(self, X: Any) -> list[int]:
        pass

    @abstractmethod
    def predict_proba(self, X: Any) -> list[float]:
        pass
