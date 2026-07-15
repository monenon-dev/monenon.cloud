#!/usr/bin/env bash
# Ubuntu에 python3.12 가 apt 기본에 없을 때 (deadsnakes PPA)
#
#   bash scripts/exaone/install-python312-deadsnakes.sh
#   export EXAONE_VENV=~/.venvs/exaone312
#   bash scripts/exaone/setup-venv.sh
set -euo pipefail

sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3.12-dev

python3.12 --version
echo "OK. Next:"
echo "  export EXAONE_VENV=~/.venvs/exaone312"
echo "  bash scripts/exaone/setup-venv.sh"
