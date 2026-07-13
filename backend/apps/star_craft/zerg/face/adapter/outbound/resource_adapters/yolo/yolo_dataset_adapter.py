"""폴더=클래스(YOLO classify) 구조의 얼굴 데이터셋 자원 어댑터.

기본 경로는 apps/star_craft/zerg/face/archive (train/·val/ 하위에 클래스별 폴더).
"""

from __future__ import annotations

from pathlib import Path

from star_craft.zerg.face.app.dtos.train_command import DatasetInfo
from star_craft.zerg.face.app.ports.output.face_dataset_port import FaceDatasetPort

_IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
_DEFAULT_ROOT = Path(__file__).resolve().parents[4] / "archive"


class YoloDatasetAdapter(FaceDatasetPort):
    def prepare(self, dataset_root: str | None) -> DatasetInfo:
        root = Path(dataset_root) if dataset_root else _DEFAULT_ROOT
        train_dir = root / "train"
        val_dir = root / "val"

        if not train_dir.is_dir() or not val_dir.is_dir():
            raise FileNotFoundError(f"train/·val/ 폴더를 찾을 수 없습니다: {root}")

        class_names = sorted(d.name for d in train_dir.iterdir() if d.is_dir())
        if not class_names:
            raise ValueError(f"클래스 폴더가 없습니다: {train_dir}")

        return DatasetInfo(
            root=str(root),
            class_names=class_names,
            train_count=self._count_images(train_dir),
            val_count=self._count_images(val_dir),
        )

    @staticmethod
    def _count_images(split_dir: Path) -> int:
        return sum(1 for p in split_dir.rglob("*") if p.suffix.lower() in _IMG_EXT)
