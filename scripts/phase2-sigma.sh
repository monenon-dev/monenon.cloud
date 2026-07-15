#!/usr/bin/env bash
# 시그마 Ubuntu(WSL) — Docker Engine 전용
# Docker Desktop(Windows) 없이 이 스크립트만 사용한다.
#
# 시그마 우분투에서:
#   cd ~/monenon.cloud   # 또는 프로젝트 경로
#   bash scripts/phase2-sigma.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker 없음. 시그마 우분투에 Docker Engine을 설치하세요."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker Engine이 응답하지 않습니다. 실행:"
  echo "  sudo service docker start"
  echo "권한 오류면: sudo usermod -aG docker \"\$USER\" 후 재로그인"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "루트 .env 없음. CLOUDFLARE_TUNNEL_TOKEN 이 필요합니다."
  exit 1
fi

if ! grep -qE '^CLOUDFLARE_TUNNEL_TOKEN=\S+' .env; then
  echo "루트 .env 에 CLOUDFLARE_TUNNEL_TOKEN 이 필요합니다."
  exit 1
fi

echo "==> Sigma: pull backend"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml pull backend

echo "==> Sigma: pgvector redis neo4j backend + cloudflared up (no frontend)"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml --profile tunnel \
  up -d pgvector redis neo4j backend cloudflared

echo "==> status"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml --profile tunnel ps

echo "Done. https://api.monenon.cloud -> Sigma Docker Engine (frontend excluded)"
