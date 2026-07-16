#!/usr/bin/env bash
# Gateway 인텐트 PEFT 학습 — 로그 레이스 없이 실행
# 사용: bash scripts/gateway/run_train_lora.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -f .venv-gateway-train/bin/activate ]]; then
  # shellcheck source=/dev/null
  source .venv-gateway-train/bin/activate
fi

mkdir -p artifacts/gateway-intent-lora logs
LOG="logs/gateway-intent-lora.log"
touch "$LOG"

echo "cwd=$(pwd)"
echo "python=$(command -v python)"
python -c "import torch; print('cuda', torch.cuda.is_available())" || true

nohup python scripts/gateway/train_intent_peft.py \
  --train scripts/gateway/data/train.jsonl \
  --val scripts/gateway/data/val.jsonl \
  --output artifacts/gateway-intent-lora \
  --model klue/roberta-small \
  --epochs 8 \
  --batch-size 8 \
  --lr 2e-4 \
  >>"$LOG" 2>&1 &

PID=$!
echo "PID=$PID"
echo "log=$ROOT/$LOG"
sleep 1
if ! kill -0 "$PID" 2>/dev/null; then
  echo "프로세스가 바로 종료됨. 로그:"
  cat "$LOG" || true
  exit 1
fi
tail -n +1 -f "$LOG"
