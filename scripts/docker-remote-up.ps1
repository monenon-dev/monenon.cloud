# 강사님 흐름 — 원격 PC(시그마, Ubuntu SSH): Hub pull → backend + cloudflared
# 루트 .env: NEO_HOST, CLOUDFLARE_TUNNEL_TOKEN 필수
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$rootEnv = Join-Path (Get-Location) ".env"
if (-not (Test-Path $rootEnv)) {
    throw "루트 .env 없음. NEO_HOST, CLOUDFLARE_TUNNEL_TOKEN 필요"
}

Write-Host "==> docker compose pull backend"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml pull backend

Write-Host "==> docker compose up backend + cloudflared"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml --profile tunnel up -d backend cloudflared

Write-Host "Done. https://api.monenon.cloud (Neo+Sigma)"
