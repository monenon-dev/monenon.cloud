"""얼굴 분류 파인튜닝 CLI.

실행 (backend/apps 에서):
    python -m star_craft.zerg.face.adapter.inbound.cli.train_cli --epochs 30 --batch 16
"""

from __future__ import annotations

import argparse
import logging

from star_craft.zerg.face.app.dtos.train_command import TrainCommand
from star_craft.zerg.face.dependencies.providers import get_train_face_model_use_case


def main() -> None:
    parser = argparse.ArgumentParser(description="YOLO 얼굴 분류 파인튜닝")
    parser.add_argument("--dataset-root", default=None, help="데이터셋 루트 (기본: apps/star_craft/zerg/face/archive)")
    parser.add_argument(
        "--model",
        default=None,
        help="기본 가중치 (기본: yolo11n-cls.pt / YOLOv11 Nano 분류판)",
    )
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--imgsz", type=int, default=None)
    parser.add_argument("--batch", type=int, default=None)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    use_case = get_train_face_model_use_case()
    result = use_case.execute(
        TrainCommand(
            dataset_root=args.dataset_root,
            base_model=args.model,
            epochs=args.epochs,
            imgsz=args.imgsz,
            batch=args.batch,
        )
    )

    print(f"[face] best weights: {result.best_weights}")
    print(f"[face] epochs: {result.epochs}")
    print(f"[face] classes ({len(result.class_names)}): {result.class_names}")
    if result.top1_accuracy is not None:
        print(f"[face] top1 accuracy: {result.top1_accuracy:.4f}")


if __name__ == "__main__":
    main()
