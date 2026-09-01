"""훈련 유스케이스 입출력 DTO."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TrainCommand:
    """훈련 요청. None인 필드는 TrainingConfig 기본값을 사용한다."""

    dataset_root: str | None = None
    base_model: str | None = None
    epochs: int | None = None
    imgsz: int | None = None
    batch: int | None = None


@dataclass(frozen=True)
class DatasetInfo:
    """outbound 데이터셋 어댑터가 반환하는 데이터셋 기술."""

    root: str
    class_names: list[str]
    train_count: int
    val_count: int


@dataclass(frozen=True)
class TrainingResult:
    """훈련 결과."""

    best_weights: str
    epochs: int
    class_names: list[str]
    top1_accuracy: float | None = None
