"""얼굴 인식(추론) 유스케이스 — 학습된 가중치로 새 이미지가 누구인지 분류한다.

학습 파이프라인과 동일하게 ultralytics를 유스케이스에서 직접 다룬다.
"""

from __future__ import annotations

import logging
from pathlib import Path

from star_craft.zerg.face.app.dtos.predict_command import (
    FacePrediction,
    PredictCommand,
    PredictionResult,
)
from star_craft.zerg.face.app.ports.input.predict_face_use_case import PredictFaceUseCase
from star_craft.zerg.face.domain.training_config import TrainingConfig

logger = logging.getLogger(__name__)


class PredictFaceInteractor(PredictFaceUseCase):
    def __init__(self, config: TrainingConfig | None = None) -> None:
        self._config = config or TrainingConfig()

    def execute(self, command: PredictCommand) -> PredictionResult:
        from ultralytics import YOLO  # 무거운 의존성은 지연 로딩

        image = command.image
        if not Path(image).exists():
            raise FileNotFoundError(f"입력 이미지를 찾을 수 없습니다: {image}")

        weights = command.weights or self._default_weights()
        if not Path(weights).exists():
            raise FileNotFoundError(
                f"학습된 가중치를 찾을 수 없습니다: {weights}. "
                "먼저 훈련을 실행하거나 --weights로 경로를 지정하세요."
            )

        logger.info("[face] 추론: weights=%s | image=%s", weights, image)
        model = YOLO(weights)
        result = model.predict(image, verbose=False)[0]

        probs = result.probs
        if probs is None:
            raise ValueError("분류 확률이 없습니다. 분류(classify) 모델 가중치인지 확인하세요.")

        names = result.names
        order = list(probs.top5)[: max(1, command.top_k)]
        ranked = [
            FacePrediction(label=names[i], confidence=float(probs.data[i])) for i in order
        ]
        top = ranked[0]
        logger.info("[face] 결과: %s (%.4f)", top.label, top.confidence)

        return PredictionResult(image=image, top=top, ranked=ranked)

    def _default_weights(self) -> str:
        """학습 CLI와 동일한 실행 위치 기준의 산출물 경로(runs/face/finetune/weights/best.pt)."""
        return str(
            Path(self._config.project) / self._config.name / "weights" / "best.pt"
        )
