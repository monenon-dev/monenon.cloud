#!/usr/bin/env bash
# EXAONE 원본 Instruct + QLoRA (AWQ 금지)
# 사용 전: Ollama/AWQ 서빙 종료로 VRAM 확보
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BASE="${EXAONE_BASE:?Set EXAONE_BASE to non-AWQ Instruct folder}"
ROLE="${1:-ingress}"

if [[ -f .venv-gateway-train/bin/activate ]]; then
  # shellcheck source=/dev/null
  source .venv-gateway-train/bin/activate
fi

echo "==> check base (must NOT be AWQ)"
python scripts/gateway/check_base_model_for_qlora.py "$BASE"

echo "==> GPU"
nvidia-smi --query-gpu=memory.used,memory.total --format=csv || true

mkdir -p "artifacts/adapters/$ROLE" logs
LOG="logs/exaone-qlora-${ROLE}.log"
touch "$LOG"

nohup python scripts/gateway/train_exaone_role_qlora.py \
  --base "$BASE" \
  --role "$ROLE" \
  --train scripts/gateway/data/train.jsonl \
  --val scripts/gateway/data/val.jsonl \
  --output "artifacts/adapters/$ROLE" \
  --epochs 1 \
  --batch-size 1 \
  --grad-accum 8 \
  --max-length 128 \
  >>"$LOG" 2>&1 &

echo "PID=$! log=$ROOT/$LOG"
sleep 2
tail -n 40 "$LOG"
