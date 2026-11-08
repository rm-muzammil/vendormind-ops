#!/usr/bin/env bash
# VendorMind Ops: deploy on a Vultr Ubuntu 24.04 VM.
# Usage: APP_DIR=/root/agent-rush-app PORT=3000 bash scripts/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/root/agent-rush-app}"
PORT="${PORT:-3000}"

[ "$(id -u)" -eq 0 ] || { echo "Run as root."; exit 1; }

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

cd "$APP_DIR"
[ -f .env.local ] || { echo ".env.local missing (copy .env.example and set VULTR_API_KEY)"; exit 1; }
if grep -q 'REPLACE_ME' .env.local; then echo "Set VULTR_API_KEY in .env.local first."; exit 1; fi

npm install
rm -rf .next   # avoids stale generated types from removed routes
npm run build

pm2 delete vendormind-guard 2>/dev/null || true
pm2 delete vendormind-ops 2>/dev/null || true
pm2 start npm --name vendormind-ops -- start -- -p "$PORT"
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null || true

ufw allow 22/tcp
ufw allow "${PORT}/tcp"
ufw --force enable

sleep 4
curl -fsS "http://127.0.0.1:${PORT}/api/health" && echo
echo "Live at http://$(curl -fsS ifconfig.me 2>/dev/null || echo '<server-ip>'):${PORT}"
echo "Next: bash scripts/enable-https.sh   (free HTTPS via Caddy + Let's Encrypt)"
