"""얼굴 인식(추론) CLI.

실행 (backend/apps 에서):
    python -m face.adapter.inbound.cli.predict_cli --image path/to/face.jpg
"""

from __future__ import annotations

import argparse
import logging

from face.app.dtos.predict_command import PredictCommand
from face.dependencies.providers import get_predict_face_use_case


def main() -> None:
    parser = argparse.ArgumentParser(description="YOLO 얼굴 분류 추론")
    parser.add_argument("--image", required=True, help="추론할 이미지 경로")
    parser.add_argument("--weights", default=None, help="가중치 경로 (기본: runs/face/finetune/weights/best.pt)")
    parser.add_argument("--top-k", type=int, default=3)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    use_case = get_predict_face_use_case()
    result = use_case.execute(
        PredictCommand(image=args.image, weights=args.weights, top_k=args.top_k)
    )

    print(f"[face] 이미지: {result.image}")
    print(f"[face] 예측: {result.top.label} ({result.top.confidence:.4f})")
    print("[face] 상위 후보:")
    for rank, cand in enumerate(result.ranked, start=1):
        print(f"  {rank}. {cand.label}: {cand.confidence:.4f}")


if __name__ == "__main__":
    main()
