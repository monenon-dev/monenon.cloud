#!/usr/bin/env python3
"""Gateway 입구 인텐트 분류기 — PEFT(LoRA/QLoRA) HuggingFace Trainer 골격.

데이터 포맷 (JSONL, 한 줄 하나):
  {"text": "전북 홈구장은?", "label": "exaone_rag"}

라벨은 scripts/gateway/label_map.json allowlist만 허용 (하네스).

주의 — EXAONE AWQ 체크포인트는 이 스크립트(및 QLoRA)에 쓰지 말 것.
  검사: python scripts/gateway/check_base_model_for_qlora.py <model_dir>
  EXAONE 7.8B 역할 어댑터: scripts/gateway/train_exaone_role_qlora.py

예시 (시그마, RTX 3050) — 소형 encoder (권장, VRAM 여유):
  cd ~/monenon.cloud
  python3 -m venv .venv-gateway-train
  source .venv-gateway-train/bin/activate
  pip install -r scripts/gateway/requirements-train.txt

  python scripts/gateway/train_intent_peft.py \\
    --train scripts/gateway/data/train.jsonl \\
    --val scripts/gateway/data/val.jsonl \\
    --output artifacts/gateway-intent-lora \\
    --model klue/roberta-small \\
    --epochs 4
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LABEL_MAP = Path(__file__).resolve().parent / "label_map.json"


def load_label_map(path: Path) -> dict[str, int]:
    data = json.loads(path.read_text(encoding="utf-8"))
    labels = data["labels"]
    return {name: i for i, name in enumerate(labels)}


def load_jsonl(path: Path, label2id: dict[str, int]) -> list[dict]:
    rows: list[dict] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        text = str(obj.get("text") or "").strip()
        label = str(obj.get("label") or "").strip()
        if not text:
            raise SystemExit(f"{path}:{line_no} empty text")
        if label not in label2id:
            raise SystemExit(
                f"{path}:{line_no} label '{label}' not in allowlist {list(label2id)}"
            )
        rows.append({"text": text, "label": label2id[label]})
    return rows


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="PEFT intent classifier trainer (gateway)")
    p.add_argument("--train", type=Path, required=True)
    p.add_argument("--val", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--label-map", type=Path, default=DEFAULT_LABEL_MAP)
    p.add_argument(
        "--model",
        default="klue/roberta-small",
        help="HF hub id. 입구용 소형 encoder 권장 (EXAONE 아님)",
    )
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--batch-size", type=int, default=8)
    p.add_argument("--lr", type=float, default=2e-4)
    p.add_argument("--max-length", type=int, default=128)
    p.add_argument("--lora-r", type=int, default=8)
    p.add_argument("--lora-alpha", type=int, default=16)
    p.add_argument(
        "--qlora",
        action="store_true",
        help="4bit 양자화 + LoRA (큰 베이스용). small 모델은 보통 불필요",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    label2id = load_label_map(args.label_map)
    id2label = {i: name for name, i in label2id.items()}
    train_rows = load_jsonl(args.train, label2id)
    val_rows = load_jsonl(args.val, label2id)

    try:
        import numpy as np
        import torch
        from datasets import Dataset
        from peft import LoraConfig, TaskType, get_peft_model, prepare_model_for_kbit_training
        from sklearn.metrics import accuracy_score, f1_score
        from transformers import (
            AutoModelForSequenceClassification,
            AutoTokenizer,
            BitsAndBytesConfig,
            DataCollatorWithPadding,
            Trainer,
            TrainingArguments,
        )
    except ImportError as exc:
        print(
            "의존성 없음. 실행:\n"
            "  pip install -r scripts/gateway/requirements-train.txt\n"
            f"상세: {exc}",
            file=sys.stderr,
        )
        return 1

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    quant_cfg = None
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    if args.qlora:
        if not torch.cuda.is_available():
            print("--qlora 는 CUDA 필요", file=sys.stderr)
            return 1
        quant_cfg = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.float16,
        )

    model = AutoModelForSequenceClassification.from_pretrained(
        args.model,
        num_labels=len(label2id),
        id2label=id2label,
        label2id=label2id,
        quantization_config=quant_cfg,
        device_map="auto" if args.qlora else None,
        torch_dtype=torch_dtype if args.qlora else None,
    )
    if args.qlora:
        model = prepare_model_for_kbit_training(model)

    # encoder 공통 타겟 (모델에 없으면 peft가 스킵/에러 — roberta 계열 기준)
    target_modules = ["query", "value"]
    lora = LoraConfig(
        task_type=TaskType.SEQ_CLS,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        target_modules=target_modules,
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    def tokenize(batch: dict) -> dict:
        return tokenizer(
            batch["text"],
            truncation=True,
            max_length=args.max_length,
        )

    train_ds = Dataset.from_list(train_rows).map(tokenize, batched=True)
    val_ds = Dataset.from_list(val_rows).map(tokenize, batched=True)
    cols = ["input_ids", "attention_mask", "label"]
    train_ds = train_ds.remove_columns(
        [c for c in train_ds.column_names if c not in cols]
    )
    val_ds = val_ds.remove_columns([c for c in val_ds.column_names if c not in cols])

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=-1)
        return {
            "accuracy": float(accuracy_score(labels, preds)),
            "f1_macro": float(f1_score(labels, preds, average="macro")),
        }

    args.output.mkdir(parents=True, exist_ok=True)
    ta_kwargs = dict(
        output_dir=str(args.output / "runs"),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.lr,
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        greater_is_better=True,
        logging_steps=10,
        report_to=[],
        fp16=torch.cuda.is_available() and not args.qlora,
    )
    # transformers 버전별 인자명 호환
    try:
        training_args = TrainingArguments(**ta_kwargs, eval_strategy="epoch")
    except TypeError:
        training_args = TrainingArguments(**ta_kwargs, evaluation_strategy="epoch")

    trainer_kwargs = dict(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        compute_metrics=compute_metrics,
    )
    try:
        trainer = Trainer(**trainer_kwargs, processing_class=tokenizer)
    except TypeError:
        trainer = Trainer(**trainer_kwargs, tokenizer=tokenizer)
    trainer.train()
    metrics = trainer.evaluate()
    print("eval:", metrics)

    # 어댑터만 저장 (클린 아키텍처: gateway 어댑터 자산)
    adapter_dir = args.output / "adapter"
    trainer.model.save_pretrained(adapter_dir)
    tokenizer.save_pretrained(adapter_dir)
    (args.output / "label_map.json").write_text(
        json.dumps({"labels": list(label2id.keys())}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (args.output / "metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"saved adapter → {adapter_dir}")
    print("하네스: 서빙 시 allowlist argmax + confidence→clarify 유지")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
