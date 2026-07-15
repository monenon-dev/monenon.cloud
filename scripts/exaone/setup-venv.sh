#!/usr/bin/env bash
# EXAONE AWQ 추론용 venv 설치 (시그마 Ubuntu)
#
#   cd ~/monenon.cloud
#   bash scripts/exaone/setup-venv.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENV="${EXAONE_VENV:-$HOME/.venvs/exaone}"

pick_python() {
  for c in python3.12 python3.11 python3.10 python3; do
    if command -v "$c" >/dev/null 2>&1; then
      echo "$c"
      return
    fi
  done
  echo "python3 not found" >&2
  exit 1
}

PY="$(pick_python)"
VER="$("$PY" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
echo "==> python: $PY ($VER)"
if [[ "$VER" == "3.14" || "$VER" == "3.13" ]]; then
  echo "경고: torch/autoawq는 보통 3.10~3.12에 더 잘 맞습니다."
  echo "가능하면: sudo apt install python3.12 python3.12-venv"
fi

mkdir -p "$(dirname "$VENV")"
if [[ ! -d "$VENV" ]]; then
  echo "==> create venv: $VENV"
  "$PY" -m venv "$VENV"
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"

python -m pip install -U pip setuptools wheel
# EXAONE remote code는 transformers 5.x / 최신 generate API와 충돌하기 쉬움 → 4.46 고정
python -m pip install -U \
  "torch" \
  "transformers==4.46.3" \
  "autoawq>=0.2.7.post3" \
  "accelerate" \
  "fastapi" \
  "uvicorn[standard]" \
  "httpx" \
  "safetensors"

echo
echo "Done. Activate:"
echo "  source $VENV/bin/activate"
echo "Smoke test (2.4B):"
echo "  EXAONE_MODEL_DIR=~/models/EXAONE-3.5-2.4B-Instruct-AWQ python $ROOT/scripts/exaone/run_exaone.py"
echo "HTTP serve (spoke only until CUDA works):"
echo "  EXAONE_FORCE_SPOKE=1 python $ROOT/scripts/exaone/serve_exaone.py"
