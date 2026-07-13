# 시그마 remote-server: Hub pull → 로컬 DB + backend + cloudflared (프론트 Docker 제외)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$rootEnv = Join-Path (Get-Location) ".env"
if (-not (Test-Path $rootEnv)) {
    throw "루트 .env 없음. CLOUDFLARE_TUNNEL_TOKEN 을 넣으세요."
}

$envContent = Get-Content $rootEnv -Raw
if ($envContent -notmatch '(?m)^CLOUDFLARE_TUNNEL_TOKEN=\S+') {
    throw "루트 .env 에 CLOUDFLARE_TUNNEL_TOKEN 이 필요합니다."
}

Write-Host "==> Sigma: pull backend image"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml pull backend

Write-Host "==> Sigma: pgvector redis neo4j backend + cloudflared up (no frontend)"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml --profile tunnel up -d pgvector redis neo4j backend cloudflared

Write-Host "Done. api.monenon.cloud -> Sigma backend (frontend excluded from Docker)"
