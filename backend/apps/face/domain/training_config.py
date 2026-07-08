"""훈련 하이퍼파라미터 값객체."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TrainingConfig:
    """YOLO 분류 파인튜닝 설정. 프레임워크에 독립적인 순수 값객체."""

    base_model: str = "yolo11n-cls.pt"
    epochs: int = 30
    imgsz: int = 224
    batch: int = 16
    project: str = "runs/face"
    name: str = "finetune"

    def __post_init__(self) -> None:
        if self.epochs <= 0:
            raise ValueError("epochs는 1 이상이어야 합니다.")
        if self.imgsz <= 0:
            raise ValueError("imgsz는 1 이상이어야 합니다.")
        if self.batch <= 0:
            raise ValueError("batch는 1 이상이어야 합니다.")
