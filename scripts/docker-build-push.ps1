# 강사님 흐름 — 접속 PC(네오): FastAPI backend 이미지 빌드 → Docker Hub push
# 폴더 매핑: 강의 fastapi/ = 이 repo backend/
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$image = if ($env:BACKEND_IMAGE) { $env:BACKEND_IMAGE } else { "whtjgml2002/monenon-backend:latest" }

Write-Host "==> docker build -t $image backend"
docker build -t $image ./backend

Write-Host "==> docker push $image"
docker push $image

Write-Host "Done. 원격 PC(시그마)에서 scripts/docker-remote-up.ps1 실행"
