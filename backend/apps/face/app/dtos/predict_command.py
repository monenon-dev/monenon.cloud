"""얼굴 인식(추론) 유스케이스 입출력 DTO."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PredictCommand:
    """추론 요청. weights가 None이면 학습 산출물 기본 경로를 사용한다."""

    image: str
    weights: str | None = None
    top_k: int = 3


@dataclass(frozen=True)
class FacePrediction:
    """한 후보의 예측 라벨·확률."""

    label: str
    confidence: float


@dataclass(frozen=True)
class PredictionResult:
    """추론 결과 — 최상위 후보와 상위 k개 순위."""

    image: str
    top: FacePrediction
    ranked: list[FacePrediction]
