#!/usr/bin/env python3
"""EXAONE-3.5 AWQ smoke test — GPU 로드 후 한 줄 생성.

시그마:
  source ~/.venvs/exaone/bin/activate
  export EXAONE_MODEL_DIR=~/models/EXAONE-3.5-2.4B-Instruct-AWQ   # 6GB면 2.4B부터
  python scripts/exaone/run_exaone.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def resolve_model_dir() -> Path:
    raw = os.environ.get("EXAONE_MODEL_DIR", "").strip()
    if not raw:
        # 2.4B 기본 (VRAM 여유). 7.8B는 EXAONE_MODEL_DIR로 지정.
        candidates = [
            Path.home() / "models" / "EXAONE-3.5-2.4B-Instruct-AWQ",
            Path.home() / "models" / "EXAONE-3.5-7.8B-Instruct-AWQ",
        ]
        for c in candidates:
            if c.is_dir():
                return c
        print("모델 디렉터리를 찾지 못했습니다. EXAONE_MODEL_DIR 을 지정하세요.", file=sys.stderr)
        sys.exit(1)
    path = Path(raw).expanduser().resolve()
    if not path.is_dir():
        print(f"모델 경로 없음: {path}", file=sys.stderr)
        sys.exit(1)
    return path


def main() -> None:
    model_dir = resolve_model_dir()
    print(f"model_dir={model_dir}")
    print(f"cuda_available={torch.cuda.is_available()}")
    if torch.cuda.is_available():
        props = torch.cuda.get_device_properties(0)
        print(f"gpu={props.name} vram_gb={props.total_memory / 1024**3:.1f}")

    tokenizer = AutoTokenizer.from_pretrained(str(model_dir), trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        str(model_dir),
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )

    messages = [
        {"role": "system", "content": "You are a helpful Korean assistant."},
        {"role": "user", "content": "한 문장으로 자기소개해 줘."},
    ]
    if hasattr(tokenizer, "apply_chat_template"):
        prompt = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
    else:
        prompt = messages[-1]["content"]

    inputs = tokenizer(prompt, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=64,
            do_sample=False,
        )
    text = tokenizer.decode(out[0][inputs["input_ids"].shape[-1] :], skip_special_tokens=True)
    print("--- reply ---")
    print(text.strip() or "(empty)")
    print("OK: EXAONE AWQ load + generate succeeded")


if __name__ == "__main__":
    main()
