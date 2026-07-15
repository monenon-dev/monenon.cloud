#!/usr/bin/env bash
# 시그마 — 로컬 backend 코드로 이미지 빌드 후 기동 (Hub pull 없음)
# moneyball /api 가 Hub 옛 이미지에 없을 때 사용.
#
#   cd ~/monenon.cloud
#   bash scripts/phase2-sigma-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker 없음. 시그마 우분투에 Docker Engine을 설치하세요."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker Engine이 응답하지 않습니다. 실행: sudo service docker start"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "루트 .env 없음. CLOUDFLARE_TUNNEL_TOKEN 이 필요합니다."
  exit 1
fi

COMPOSE=(docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml)

echo "==> check moneyball source"
if [[ ! -f backend/apps/moneyball/adapter/inbound/api/v1/chat_router.py ]]; then
  echo "moneyball chat_router.py 없음. git pull origin sigma 먼저 하세요."
  exit 1
fi

# 로컬 전용 태그 — Hub latest 와 섞이지 않게
export BACKEND_IMAGE="${BACKEND_IMAGE:-monenon-backend:sigma-local}"

echo "==> build backend image: $BACKEND_IMAGE"
"${COMPOSE[@]}" build backend

echo "==> up (no Hub pull) pgvector redis neo4j backend cloudflared"
"${COMPOSE[@]}" --profile tunnel \
  up -d --pull never --force-recreate pgvector redis neo4j backend cloudflared

echo "==> verify moneyball inside container"
"${COMPOSE[@]}" exec -T backend ls /app/apps/moneyball/adapter/inbound/api/v1/ || true
"${COMPOSE[@]}" exec -T backend python -c \
  "from moneyball.adapter.inbound.api import moneyball_router; print('routes', [r.path for r in moneyball_router.routes])" \
  || true

echo "==> status"
"${COMPOSE[@]}" --profile tunnel ps

echo "Done. Test:"
echo "  curl -s http://127.0.0.1:8000/openapi.json | grep moneyball"
echo "  curl -s http://127.0.0.1:8000/api/moneyball/overview"
