# 시그마 — Docker Desktop 불필요.
# 실제 실행은 시그마 Ubuntu(WSL) Docker Engine (scripts/phase2-sigma.sh).
#
# 권장: 시그마 우분투 터미널에서
#   cd ~/monenon.cloud && bash scripts/phase2-sigma.sh
#
# 이 파일을 Windows PowerShell에서 실행하면 WSL로 위임한다.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$wslCmd = @'
set -e
if [ -d "$HOME/monenon.cloud" ]; then
  cd "$HOME/monenon.cloud"
elif [ -d "/mnt/c/Users/hi/Documents/cloud.monenon" ]; then
  cd /mnt/c/Users/hi/Documents/cloud.monenon
else
  echo "프로젝트를 찾을 수 없습니다. 시그마 우분투에서 ~/monenon.cloud 로 clone/복사하세요."
  exit 1
fi
bash scripts/phase2-sigma.sh
'@

Write-Host "==> Delegating to Sigma WSL Docker Engine (not Docker Desktop)"
wsl -e bash -lc $wslCmd
