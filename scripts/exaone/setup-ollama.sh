#!/usr/bin/env bash
# EXAONE을 Ollama로 설치 (AWQ/transformers 500 우회 — 권장)
#
#   bash scripts/exaone/setup-ollama.sh
set -euo pipefail

if ! command -v ollama >/dev/null 2>&1; then
  echo "==> install Ollama"
  curl -fsSL https://ollama.com/install.sh | sh
fi

echo "==> start ollama (if not running)"
if ! curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  nohup ollama serve >/tmp/ollama-serve.log 2>&1 &
  sleep 2
fi

echo "==> pull spoke (2.4B) then hub (7.8B)"
ollama pull exaone3.5:2.4b
ollama pull exaone3.5:7.8b || echo "7.8B pull 실패 가능 — 2.4B만으로도 Moneyball 동작"

echo "==> smoke"
ollama run exaone3.5:2.4b "한 줄로 인사해 줘."

echo
echo "OK. Moneyball backend/.env 에:"
echo "  MONEYBALL_LLM_MODE=ollama"
echo "  OLLAMA_BASE_URL=http://172.17.0.1:11434"
echo "  MONEYBALL_HUB_MODEL=exaone3.5:7.8b"
echo "  MONEYBALL_SPOKE_MODEL=exaone3.5:2.4b"
echo "그다음 phase2-sigma-local.sh 로 백엔드 재기동"
