"""YOLO Hello World — 사전학습 모델로 이미지에서 객체(사람 등)를 탐지한다.

실행 (backend/ 기준):
    python apps/face/hello_yolo.py
    python apps/face/hello_yolo.py --image path/to/img.jpg --model yolo11n.pt

Docker/헤드리스 환경에서는 창을 띄우지 않고 탐지 결과 이미지를 파일로 저장한다.
얼굴 전용 탐지는 파인튜닝(또는 face 전용 가중치)이 필요하며, 이 스크립트는
COCO 사전학습 모델이라 'person' 단위로 탐지된다.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO
from ultralytics.utils import ASSETS


def run(model_name: str, image: str | None) -> Path:
    source = image or str(ASSETS / "zidane.jpg")
    model = YOLO(model_name)  # 최초 실행 시 가중치 자동 다운로드
    result = model.predict(source, verbose=False)[0]

    out_dir = Path(__file__).parent / "runs"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "hello_yolo.jpg"
    result.save(filename=str(out_path))

    print(f"[face] 모델: {model_name} | 소스: {source}")
    print(f"[face] 탐지 {len(result.boxes)}건")
    for box in result.boxes:
        label = result.names[int(box.cls)]
        print(f"  - {label}: {float(box.conf):.2f}")
    print(f"[face] 결과 이미지 저장: {out_path}")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="YOLO Hello World")
    parser.add_argument("--model", default="yolo11n.pt", help="YOLO 가중치 (기본: yolo11n.pt)")
    parser.add_argument("--image", default=None, help="분석할 이미지 경로 (기본: ultralytics 샘플)")
    args = parser.parse_args()
    run(args.model, args.image)


if __name__ == "__main__":
    main()
