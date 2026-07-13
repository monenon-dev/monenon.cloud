# 강사님 흐름 — 원격 PC(시그마, Ubuntu SSH): Hub pull → DB + backend + cloudflared
# 프론트엔드는 Docker 배포에서 제외 (remote-server는 백엔드만)
# 루트 .env: CLOUDFLARE_TUNNEL_TOKEN 필수
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$rootEnv = Join-Path (Get-Location) ".env"
if (-not (Test-Path $rootEnv)) {
    throw "루트 .env 없음. CLOUDFLARE_TUNNEL_TOKEN 필요"
}

Write-Host "==> docker compose pull backend"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml pull backend

Write-Host "==> docker compose up DB + backend + cloudflared (no frontend)"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml --profile tunnel up -d pgvector redis neo4j backend cloudflared

Write-Host "Done. https://api.monenon.cloud (Sigma backend only)"
