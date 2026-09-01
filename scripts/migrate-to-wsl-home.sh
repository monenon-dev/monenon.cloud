#!/bin/bash
# 시그마 WSL: /mnt/c/... → ~/monenon.cloud 로 프로젝트 이동 (AWS 배포와 동일한 Linux 경로 습관)
set -euo pipefail

WIN_SRC="/mnt/c/Users/hi/Documents/cloud.monenon"
HOME_DST="$HOME/monenon.cloud"

if [[ ! -d "$WIN_SRC" ]]; then
  echo "Windows 경로 없음: $WIN_SRC"
  echo "경로 확인 후 WIN_SRC 를 수정하세요."
  exit 1
fi

mkdir -p "$HOME_DST"

if [[ -d "$HOME_DST/.git" ]]; then
  echo "이미 $HOME_DST 에 git repo 가 있습니다."
  echo "최신만 맞추려면: cd $HOME_DST && git pull origin main"
  exit 0
fi

echo "==> 복사: $WIN_SRC -> $HOME_DST"
cp -a "$WIN_SRC/." "$HOME_DST/"

cd "$HOME_DST"
git config core.fileMode false
git config core.autocrlf input

echo ""
echo "완료. 앞으로 WSL 에서:"
echo "  cd ~/monenon.cloud"
echo "  git pull origin main"
echo "  docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml --profile tunnel up -d pgvector redis neo4j backend cloudflared"
echo ""
echo "확인: ls ~/monenon.cloud/backend/.env  ~/monenon.cloud/.env"
