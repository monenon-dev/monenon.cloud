"""얼굴 인식(추론) 입력 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.zerg.face.app.dtos.predict_command import PredictCommand, PredictionResult


class PredictFaceUseCase(ABC):
    @abstractmethod
    def execute(self, command: PredictCommand) -> PredictionResult:
        raise NotImplementedError
