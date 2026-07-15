# 시그마 Ubuntu Docker Engine — Windows Docker Desktop 사용 안 함.
# 시그마 우분투에서: bash scripts/phase2-sigma.sh
# 이 파일은 WSL로 위임한다.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "phase2-sigma.ps1")
