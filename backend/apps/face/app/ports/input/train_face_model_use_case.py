"""훈련 유스케이스 입력 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod

from face.app.dtos.train_command import TrainCommand, TrainingResult


class TrainFaceModelUseCase(ABC):
    @abstractmethod
    def execute(self, command: TrainCommand) -> TrainingResult:
        raise NotImplementedError
