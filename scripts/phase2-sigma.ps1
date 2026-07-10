# 2단계 시그마: Hub pull → Neo 공유 DB → 터널 커넥터 (backend + cloudflared)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$rootEnv = Join-Path (Get-Location) ".env"
if (-not (Test-Path $rootEnv)) {
    throw "루트 .env 없음. NEO_HOST 와 CLOUDFLARE_TUNNEL_TOKEN 을 넣으세요."
}

$envContent = Get-Content $rootEnv -Raw
if ($envContent -notmatch '(?m)^NEO_HOST=\S+') {
    throw "루트 .env 에 NEO_HOST=<네오 LAN IP> 가 필요합니다."
}
if ($envContent -notmatch '(?m)^CLOUDFLARE_TUNNEL_TOKEN=\S+') {
    throw "루트 .env 에 CLOUDFLARE_TUNNEL_TOKEN 이 필요합니다 (네오와 동일)."
}

Write-Host "==> Sigma phase2: pull backend image"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml pull backend

Write-Host "==> Sigma phase2: backend + cloudflared up"
docker compose -f docker-compose.yaml -f docker-compose.sigma.yaml --profile tunnel up -d backend cloudflared

Write-Host "Done. api.monenon.cloud -> Neo + Sigma (shared DB on Neo)"
