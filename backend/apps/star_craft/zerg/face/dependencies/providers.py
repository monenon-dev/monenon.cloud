"""훈련·추론 유스케이스 DI 조립."""

from __future__ import annotations

from star_craft.zerg.face.adapter.outbound.resource_adapters.yolo.yolo_dataset_adapter import (
    YoloDatasetAdapter,
)
from star_craft.zerg.face.app.ports.input.predict_face_use_case import PredictFaceUseCase
from star_craft.zerg.face.app.ports.input.train_face_model_use_case import TrainFaceModelUseCase
from star_craft.zerg.face.app.use_cases.predict_face_interactor import PredictFaceInteractor
from star_craft.zerg.face.app.use_cases.train_face_model_interactor import TrainFaceModelInteractor


def get_train_face_model_use_case() -> TrainFaceModelUseCase:
    return TrainFaceModelInteractor(dataset=YoloDatasetAdapter())


def get_predict_face_use_case() -> PredictFaceUseCase:
    return PredictFaceInteractor()
