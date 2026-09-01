#!/usr/bin/env bash
# EC2 — Docker Nginx + Certbot 최초 SSL 발급
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="${DOMAIN:-api.monenon.cloud}"
EMAIL="${CERTBOT_EMAIL:-}"

if [[ -z "$EMAIL" ]]; then
  echo "CERTBOT_EMAIL 환경 변수를 설정하세요."
  echo "  export CERTBOT_EMAIL='you@example.com'"
  exit 1
fi

echo "==> 사전: 시스템 nginx / 기존 my-nginx 정리"
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl disable nginx 2>/dev/null || true
docker rm -f my-nginx monenon-nginx 2>/dev/null || true

mkdir -p certbot/conf certbot/www nginx/conf.d

echo "==> 1단계: HTTP 전용 Nginx 설정 (인증서 발급용)"
cp nginx/templates/api.http.conf nginx/conf.d/default.conf

echo "==> Nginx + Certbot 컨테이너 기동"
docker compose -f docker-compose.nginx.yaml up -d nginx

echo "==> backend(8000) 응답 확인"
if ! curl -sf http://127.0.0.1:8000/ >/dev/null; then
  echo "경고: localhost:8000 에 backend 가 없습니다. monenoncloud compose 먼저 올리세요."
fi

echo "==> 2단계: 최초 인증서 발급 (webroot)"
docker compose -f docker-compose.nginx.yaml run --rm certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

echo "==> 3단계: HTTPS 설정 적용"
cp nginx/templates/api.ssl.conf nginx/conf.d/default.conf
docker exec monenon-nginx nginx -t
docker exec monenon-nginx nginx -s reload

echo "==> Certbot 자동 갱신 컨테이너 포함 전체 기동"
docker compose -f docker-compose.nginx.yaml up -d

echo "==> 확인"
docker compose -f docker-compose.nginx.yaml ps
curl -sI "https://${DOMAIN}/" | head -n 5 || true
echo "Done. https://${DOMAIN}"
