#!/usr/bin/env python3
"""QLoRA 학습 전 베이스 모델 폴더 검사.

AWQ(autoawq) 체크포인트는 fused GEMM 추론용이라 표준 QLoRA(bitsandbytes 4bit)
학습과 호환되지 않는다. PEFT 공식 quantization 가이드의 학습 백엔드는
bitsandbytes / GPTQ / AQLM / EETQ / HQQ / torchao / INC 중심이다.

사용:
  python scripts/gateway/check_base_model_for_qlora.py /path/to/EXAONE-3.5-7.8B-Instruct
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def inspect_model_dir(model_dir: Path) -> dict:
    cfg_path = model_dir / "config.json"
    if not cfg_path.is_file():
        raise FileNotFoundError(f"config.json 없음: {cfg_path}")
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    quant = cfg.get("quantization_config") or {}
    quant_method = str(
        quant.get("quant_method")
        or quant.get("quant_method".upper())
        or cfg.get("quantization_config", {}).get("quant_method")
        or ""
    ).lower()
    # AWQ configs often embed method in nested dict
    if not quant_method and isinstance(quant, dict):
        quant_method = str(quant.get("quant_method", "")).lower()
    has_awq = (
        "awq" in quant_method
        or "awq" in json.dumps(cfg).lower()
        or "autoawq" in json.dumps(cfg).lower()
        or "AWQ" in model_dir.name
        or "awq" in model_dir.name.lower()
    )
    # safetensors / bin presence
    safetensors = list(model_dir.glob("*.safetensors"))
    bins = list(model_dir.glob("*.bin"))
    return {
        "path": str(model_dir.resolve()),
        "architectures": cfg.get("architectures"),
        "model_type": cfg.get("model_type"),
        "quantization_config": quant or None,
        "quant_method": quant_method or None,
        "is_awq": has_awq,
        "safetensors_count": len(safetensors),
        "bin_count": len(bins),
        "ok_for_qlora": (not has_awq) and (len(safetensors) + len(bins) > 0),
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("model_dir", type=Path, help="HF 형식 모델 디렉터리")
    args = p.parse_args()
    if not args.model_dir.is_dir():
        print(f"FAIL: 디렉터리 아님: {args.model_dir}", file=sys.stderr)
        return 2
    try:
        info = inspect_model_dir(args.model_dir)
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 2

    print(json.dumps(info, ensure_ascii=False, indent=2))
    if info["is_awq"]:
        print(
            "\nFAIL: AWQ 체크포인트입니다.\n"
            "  → QLoRA는 원본(비양자화) Instruct 가중치를 bitsandbytes NF4로\n"
            "    로드한 뒤 LoRA를 얹어야 합니다.\n"
            "  → 예: LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct (AWQ 아님)\n"
            "  → 추론용 AWQ/Ollama GGUF는 그대로 두고, 학습만 fp16/bf16 베이스 사용.",
            file=sys.stderr,
        )
        return 1
    if not info["ok_for_qlora"]:
        print("\nFAIL: 가중치 파일(*.safetensors/*.bin)이 없습니다.", file=sys.stderr)
        return 1
    print("\nOK: QLoRA(bitsandbytes) 학습용 베이스로 적합합니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
