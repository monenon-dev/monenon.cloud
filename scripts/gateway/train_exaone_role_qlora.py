#!/usr/bin/env python3
"""EXAONE(원본 Instruct) + bitsandbytes QLoRA — 역할별 어댑터 학습 골격.

중요 (PEFT quantization 가이드 기준):
  - AWQ 체크포인트 위에 표준 QLoRA를 얹지 말 것 (추론 전용 커널).
  - 베이스는 비양자화 Instruct → 로드 시 BitsAndBytesConfig(NF4).
  - 역할마다 어댑터 디렉터리를 분리 (ingress / hub_route / spoke / synth).

VRAM (RTX 3050 6GB):
  - AWQ/Ollama 서빙을 끄고 학습할 것.
  - batch=1, grad_accum, gradient_checkpointing, max_length 짧게.

예:
  python scripts/gateway/check_base_model_for_qlora.py ~/models/EXAONE-3.5-7.8B-Instruct

  python scripts/gateway/train_exaone_role_qlora.py \\
    --base ~/models/EXAONE-3.5-7.8B-Instruct \\
    --role ingress \\
    --train scripts/gateway/data/train.jsonl \\
    --val scripts/gateway/data/val.jsonl \\
    --output artifacts/adapters/ingress \\
    --epochs 1 --batch-size 1 --grad-accum 8 --max-length 128
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from check_base_model_for_qlora import inspect_model_dir  # noqa: E402

ROLES = ("ingress", "hub_route", "spoke", "synth")
LABEL_MAP = Path(__file__).resolve().parent / "label_map.json"


def load_jsonl_classify(path: Path, label2id: dict[str, int]) -> list[dict]:
    rows: list[dict] = []
    for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        text = str(obj.get("text") or "").strip()
        label = str(obj.get("label") or "").strip()
        if not text or label not in label2id:
            raise SystemExit(f"{path}:{i} invalid row")
        # causal LM: instruction → label token
        prompt = (
            "### Role: ingress_classifier\n"
            "### Instruction: Classify intent. Reply with label only.\n"
            f"### Input: {text}\n"
            "### Response: "
        )
        rows.append({"text": prompt + label})
    return rows


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--base", type=Path, required=True, help="원본 Instruct 폴더 (AWQ 금지)")
    p.add_argument("--role", choices=ROLES, default="ingress")
    p.add_argument("--train", type=Path, required=True)
    p.add_argument("--val", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--label-map", type=Path, default=LABEL_MAP)
    p.add_argument("--epochs", type=int, default=1)
    p.add_argument("--batch-size", type=int, default=1)
    p.add_argument("--grad-accum", type=int, default=8)
    p.add_argument("--lr", type=float, default=1e-4)
    p.add_argument("--max-length", type=int, default=128)
    p.add_argument("--lora-r", type=int, default=8)
    p.add_argument("--lora-alpha", type=int, default=16)
    return p.parse_args()


def main() -> int:
    args = parse_args()
    info = inspect_model_dir(args.base)
    if info["is_awq"] or not info["ok_for_qlora"]:
        print(
            "베이스가 QLoRA에 부적합합니다. check_base_model_for_qlora.py 결과를 확인하세요.\n"
            f"{json.dumps(info, ensure_ascii=False, indent=2)}",
            file=sys.stderr,
        )
        return 1
    if args.role != "ingress":
        print(
            f"경고: 현재 스크립트는 ingress 분류 JSONL 포맷만 구현됨 "
            f"(요청 role={args.role}). 데이터 스키마를 맞춘 뒤 확장하세요.",
            file=sys.stderr,
        )

    label2id = {
        name: i
        for i, name in enumerate(json.loads(args.label_map.read_text(encoding="utf-8"))["labels"])
    }
    train_rows = load_jsonl_classify(args.train, label2id)
    val_rows = load_jsonl_classify(args.val, label2id)

    try:
        import torch
        from datasets import Dataset
        from peft import LoraConfig, TaskType, get_peft_model, prepare_model_for_kbit_training
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            BitsAndBytesConfig,
            DataCollatorForLanguageModeling,
            Trainer,
            TrainingArguments,
        )
    except ImportError as exc:
        print(
            "pip install -r scripts/gateway/requirements-train.txt\n"
            f"{exc}",
            file=sys.stderr,
        )
        return 1

    if not torch.cuda.is_available():
        print("CUDA 필요 (QLoRA).", file=sys.stderr)
        return 1

    free, total = torch.cuda.mem_get_info(0)
    print(f"GPU free={free/1e9:.2f}GB / total={total/1e9:.2f}GB")
    if free < 3.5e9:
        print(
            "VRAM이 부족합니다. Ollama/AWQ 서빙을 종료한 뒤 다시 실행하세요.\n"
            "  ollama stop  또는  AWQ serve 프로세스 kill",
            file=sys.stderr,
        )
        return 1

    bnb = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=torch.float16,
    )
    tokenizer = AutoTokenizer.from_pretrained(str(args.base), trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        str(args.base),
        quantization_config=bnb,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.float16,
    )
    model = prepare_model_for_kbit_training(model)
    model.gradient_checkpointing_enable()

    lora = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        target_modules="all-linear",
        bias="none",
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    def tok(batch: dict) -> dict:
        out = tokenizer(
            batch["text"],
            truncation=True,
            max_length=args.max_length,
            padding=False,
        )
        out["labels"] = out["input_ids"].copy()
        return out

    train_ds = Dataset.from_list(train_rows).map(tok, batched=True, remove_columns=["text"])
    val_ds = Dataset.from_list(val_rows).map(tok, batched=True, remove_columns=["text"])

    args.output.mkdir(parents=True, exist_ok=True)
    training_args = TrainingArguments(
        output_dir=str(args.output / "runs"),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        logging_steps=5,
        eval_strategy="epoch",
        save_strategy="epoch",
        fp16=True,
        optim="paged_adamw_8bit",
        report_to=[],
        gradient_checkpointing=True,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
    )
    # role 메타
    (args.output / "role.json").write_text(
        json.dumps(
            {
                "role": args.role,
                "base": str(args.base.resolve()),
                "quant": "bitsandbytes-nf4-qlora",
                "not_awq": True,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    trainer.train()
    adapter = args.output / "adapter"
    trainer.model.save_pretrained(adapter)
    tokenizer.save_pretrained(adapter)
    print(f"saved role={args.role} adapter → {adapter}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
