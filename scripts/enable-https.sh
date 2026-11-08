#!/usr/bin/env bash
# Puts Caddy in front of the app with automatic HTTPS (Let's Encrypt).
# Default hostname is <ip-with-dashes>.sslip.io, which needs no domain purchase.
# Use your own domain with: DOMAIN=app.example.com bash scripts/enable-https.sh
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Run as root."; exit 1; }

PORT="${PORT:-3000}"
IP="${SERVER_IP:-$(curl -fsS ifconfig.me)}"
DOMAIN="${DOMAIN:-${IP//./-}.sslip.io}"

apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
  encode gzip
  reverse_proxy 127.0.0.1:${PORT}
}
EOF

ufw allow 80/tcp
ufw allow 443/tcp
systemctl enable --now caddy
systemctl reload caddy

echo "Waiting for the certificate..."
sleep 10
curl -fsS "https://${DOMAIN}/api/health" && echo
echo "Live at https://${DOMAIN}"
