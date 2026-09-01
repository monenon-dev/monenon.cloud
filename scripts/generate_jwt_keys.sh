#!/usr/bin/env bash
# RS256 JWT 키 쌍 생성 → auth(.env.auth) / api(.env) 에 넣을 PEM
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/backend/.keys}"
mkdir -p "$OUT"

openssl genrsa -out "$OUT/jwt_private.pem" 2048
openssl rsa -in "$OUT/jwt_private.pem" -pubout -out "$OUT/jwt_public.pem"

# 한 줄 base64 (env에 넣기 쉬움)
PRIV_B64=$(base64 -w0 <"$OUT/jwt_private.pem" 2>/dev/null || base64 <"$OUT/jwt_private.pem" | tr -d '\n')
PUB_B64=$(base64 -w0 <"$OUT/jwt_public.pem" 2>/dev/null || base64 <"$OUT/jwt_public.pem" | tr -d '\n')

cat <<EOF

생성됨:
  $OUT/jwt_private.pem  → backend/.env.auth 의 JWT_PRIVATE_KEY (또는 base64)
  $OUT/jwt_public.pem   → backend/.env (또는 .env.backend) 의 JWT_PUBLIC_KEY

예시 (base64 한 줄):
  JWT_PRIVATE_KEY=$PRIV_B64
  JWT_PUBLIC_KEY=$PUB_B64

PEM 파일·.env.auth 는 gitignore 대상입니다. 커밋하지 마세요.
EOF
