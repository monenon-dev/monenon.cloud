# 2단계 네오: backend 빌드 → Docker Hub push → 터널 스택 기동
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$image = if ($env:BACKEND_IMAGE) { $env:BACKEND_IMAGE } else { "whtjgml2002/monenon-backend:latest" }

Write-Host "==> Neo phase2: build $image"
docker compose build backend
docker push $image

Write-Host "==> Neo phase2: tunnel stack up"
docker compose --profile tunnel up -d

Write-Host "Done. api.choseohee.com -> Neo backend (+ DB/Redis/Neo4j)"
