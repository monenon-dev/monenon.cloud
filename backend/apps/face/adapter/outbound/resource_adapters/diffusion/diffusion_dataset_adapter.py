"""Diffusion 학습용 데이터셋 자원 어댑터 (스켈레톤).

아직 diffusion 파이프라인은 사용하지 않는다. 실제 데이터 포맷이 정해지면
prepare()를 구현한다. FaceDatasetPort 계약(같은 DatasetInfo 반환)을 따른다.
"""

from __future__ import annotations

from face.app.dtos.train_command import DatasetInfo
from face.app.ports.output.face_dataset_port import FaceDatasetPort


class DiffusionDatasetAdapter(FaceDatasetPort):
    def prepare(self, dataset_root: str | None) -> DatasetInfo:
        raise NotImplementedError(
            "Diffusion 데이터셋 어댑터는 아직 구현되지 않았습니다."
        )
