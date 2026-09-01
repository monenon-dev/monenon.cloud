"""데이터셋 연결 출력 포트 — 구현은 adapter/outbound/resource_adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.zerg.face.app.dtos.train_command import DatasetInfo


class FaceDatasetPort(ABC):
    @abstractmethod
    def prepare(self, dataset_root: str | None) -> DatasetInfo:
        """데이터셋을 검증·기술하고 훈련에 쓸 정보를 반환한다."""
        raise NotImplementedError
