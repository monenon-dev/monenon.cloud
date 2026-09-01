#!/usr/bin/env bash
# EXAONE AWQ 추론용 venv 설치 (시그마 Ubuntu)
#
# Python 3.14 에서는 tokenizers/torch 휠이 불안정합니다. 3.12를 쓰세요.
#
#   sudo apt install -y python3.12 python3.12-venv
#   export EXAONE_VENV=~/.venvs/exaone312
#   bash scripts/exaone/setup-venv.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENV="${EXAONE_VENV:-$HOME/.venvs/exaone312}"

pick_python() {
  for c in python3.12 python3.11 python3.10; do
    if command -v "$c" >/dev/null 2>&1; then
      echo "$c"
      return
    fi
  done
  if command -v python3 >/dev/null 2>&1; then
    VER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    if [[ "$VER" == "3.14" || "$VER" == "3.13" ]]; then
      echo "python3 ($VER) 는 EXAONE/torch 에 부적합합니다." >&2
      echo "설치 후 다시 실행:" >&2
      echo "  sudo apt install -y python3.12 python3.12-venv" >&2
      echo "  export EXAONE_VENV=~/.venvs/exaone312" >&2
      echo "  bash scripts/exaone/setup-venv.sh" >&2
      exit 1
    fi
    echo "python3"
    return
  fi
  echo "python3.12 없음" >&2
  exit 1
}

PY="$(pick_python)"
VER="$("$PY" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
echo "==> python: $PY ($VER)  venv: $VENV"

mkdir -p "$(dirname "$VENV")"
if [[ ! -d "$VENV" ]]; then
  echo "==> create venv: $VENV"
  "$PY" -m venv "$VENV"
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"

python -m pip install -U pip setuptools wheel

# 드라이버 CUDA 12.6 (12060) 이면 cu130 torch 는 거부됨 → cu124 권장
echo "==> install torch (cu124)"
python -m pip install -U torch --index-url https://download.pytorch.org/whl/cu124

python -m pip install -U \
  "transformers==4.46.3" \
  "autoawq>=0.2.7.post3" \
  "accelerate" \
  "fastapi" \
  "uvicorn[standard]" \
  "httpx" \
  "safetensors"

python -c "import torch; print('cuda', torch.cuda.is_available(), 'torch', torch.__version__)"

echo
echo "Done. Activate:"
echo "  source $VENV/bin/activate"
echo "Serve (spoke only):"
echo "  export EXAONE_FORCE_SPOKE=1"
echo "  export EXAONE_SPOKE_DIR=~/models/EXAONE-3.5-2.4B-Instruct-AWQ"
echo "  python $ROOT/scripts/exaone/serve_exaone.py"
