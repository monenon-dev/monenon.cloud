#!/usr/bin/env bash
# PoC 로컬 Hub: Qwen2.5-1.5B-Instruct (입구 분류 + RAG hub/spoke 공용)
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

echo "==> pull PoC hub (Qwen2.5-1.5B-Instruct)"
ollama pull qwen2.5:1.5b-instruct || ollama pull qwen2.5:1.5b

echo "==> smoke"
MODEL=$(ollama list | awk '/qwen2\.5:1\.5b/{print $1; exit}')
ollama run "${MODEL:-qwen2.5:1.5b}" "한 줄로 인사해 줘."

echo
echo "OK. Moneyball backend/.env 에:"
echo "  MONEYBALL_LLM_MODE=ollama"
echo "  OLLAMA_BASE_URL=http://172.17.0.1:11434"
echo "  POC_HUB_MODEL=qwen2.5:1.5b-instruct"
echo "  MONEYBALL_HUB_MODEL=qwen2.5:1.5b-instruct"
echo "  MONEYBALL_SPOKE_MODEL=qwen2.5:1.5b-instruct"
echo "  GATEWAY_INTENT_BACKEND=local"
echo "  GATEWAY_HUB_MODEL=qwen2.5:1.5b-instruct"
echo "그다음 phase2-sigma-local.sh 로 백엔드 재기동"
echo
echo "참고: 시맨틱 라우터에 QLoRA는 PoC에서 불필요 (프롬프트+allowlist)."
