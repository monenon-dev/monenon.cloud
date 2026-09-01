#!/usr/bin/env bash
# EC2 — GitHub Deploy Key 설정 (SSH clone/pull)
set -euo pipefail

REPO="monenon-dev/monenon.cloud"
KEY="$HOME/.ssh/github_deploy"
SSH_CONFIG="$HOME/.ssh/config"
ROOT="${1:-$HOME/monenon.cloud}"

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

if [[ ! -f "$KEY" ]]; then
  ssh-keygen -t ed25519 -C "monenon-ec2-deploy" -f "$KEY" -N ""
fi
chmod 600 "$KEY"
chmod 644 "${KEY}.pub"

if ! grep -q "IdentityFile $KEY" "$SSH_CONFIG" 2>/dev/null; then
  cat >> "$SSH_CONFIG" <<EOF

Host github.com
    HostName github.com
    User git
    IdentityFile $KEY
    IdentitiesOnly yes
EOF
  chmod 600 "$SSH_CONFIG"
fi

PUB="$(cat "${KEY}.pub")"

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "==> GitHub API로 Deploy key 등록 시도"
  HTTP_CODE=$(curl -sS -o /tmp/gh-deploy-key.json -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO}/keys" \
    -d "{\"title\":\"monenon-ec2-deploy\",\"key\":\"${PUB}\",\"read_only\":true}")
  if [[ "$HTTP_CODE" == "201" ]]; then
    echo "Deploy key 등록 완료"
  else
    echo "API 등록 실패 (HTTP $HTTP_CODE). 수동 등록 필요:"
    cat /tmp/gh-deploy-key.json
    echo
    echo "공개키:"
    echo "$PUB"
    exit 1
  fi
else
  echo "==> GitHub에 아래 공개키를 Deploy key로 등록하세요"
  echo "    ${REPO} → Settings → Deploy keys → Add deploy key"
  echo "    Title: monenon-ec2-deploy"
  echo
  echo "$PUB"
  echo
  read -r -p "GitHub에 등록했으면 Enter..."
fi

if [[ -d "$ROOT/.git" ]]; then
  cd "$ROOT"
  git remote set-url origin "git@github.com:${REPO}.git"
  echo "==> remote 확인"
  git remote -v
  echo "==> SSH 연결 테스트"
  ssh -T git@github.com || true
  echo "==> git pull 테스트"
  git pull
fi

echo "Done."
