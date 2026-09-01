#!/usr/bin/env bash
# 시그마 Ubuntu(WSL) Docker Engine — Hub pull 후 백엔드+터널 기동
# (구 docker-remote-up.ps1 Windows Desktop 경로 대체)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/phase2-sigma.sh"
