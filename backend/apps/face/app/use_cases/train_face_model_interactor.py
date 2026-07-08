"""훈련 워크플로우 오케스트레이션 — 데이터셋 준비 → YOLO 파인튜닝 → 결과 반환.

데이터셋 공급은 출력 포트로 격리하고, 훈련 엔진(ultralytics)은 이 유스케이스에서 직접 다룬다.
"""

from __future__ import annotations

import logging
from pathlib import Path

from face.app.dtos.train_command import TrainCommand, TrainingResult
from face.app.ports.input.train_face_model_use_case import TrainFaceModelUseCase
from face.app.ports.output.face_dataset_port import FaceDatasetPort
from face.domain.training_config import TrainingConfig

logger = logging.getLogger(__name__)

_TOP1_KEYS = ("metrics/accuracy_top1", "metrics/accuracy_top1(%)", "top1")


class TrainFaceModelInteractor(TrainFaceModelUseCase):
    def __init__(
        self,
        dataset: FaceDatasetPort,
        base_config: TrainingConfig | None = None,
    ) -> None:
        self._dataset = dataset
        self._base = base_config or TrainingConfig()

    def execute(self, command: TrainCommand) -> TrainingResult:
        from ultralytics import YOLO  # 무거운 의존성은 지연 로딩

        info = self._dataset.prepare(command.dataset_root)
        logger.info(
            "[face] 데이터셋: %s | 클래스 %d개 %s | train=%d val=%d",
            info.root,
            len(info.class_names),
            info.class_names,
            info.train_count,
            info.val_count,
        )

        config = self._merge(command)
        logger.info("[face] YOLO(%s) 파인튜닝 시작", config.base_model)
        model = YOLO(config.base_model)
        results = model.train(
            data=info.root,
            epochs=config.epochs,
            imgsz=config.imgsz,
            batch=config.batch,
            project=config.project,
            name=config.name,
            exist_ok=True,
        )

        save_dir = Path(getattr(results, "save_dir", config.project))
        best_weights = save_dir / "weights" / "best.pt"
        metrics = getattr(results, "results_dict", None) or {}
        top1 = next((float(metrics[k]) for k in _TOP1_KEYS if k in metrics), None)

        logger.info("[face] 훈련 완료: %s (top1=%s)", best_weights, top1)
        return TrainingResult(
            best_weights=str(best_weights),
            epochs=config.epochs,
            class_names=info.class_names,
            top1_accuracy=top1,
        )

    def _merge(self, command: TrainCommand) -> TrainingConfig:
        base = self._base
        return TrainingConfig(
            base_model=command.base_model or base.base_model,
            epochs=command.epochs or base.epochs,
            imgsz=command.imgsz or base.imgsz,
            batch=command.batch or base.batch,
            project=base.project,
            name=base.name,
        )
