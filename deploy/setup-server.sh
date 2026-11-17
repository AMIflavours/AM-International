#!/bin/bash
# One time server setup for Ubuntu 22.04 or 24.04 (Hostinger VPS). Run as root:
#   bash setup-server.sh
# It installs Node 22, Nginx, PM2 and a firewall, and creates the folders the deploy uses.
# It does not ask for or store any password.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Run this as root."; exit 1; fi

APP_USER=deploy
APP_DIR=/var/www/am-international
UPLOAD_DIR=/var/www/am-uploads

echo "== Updating system =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg git rsync ufw nginx certbot python3-certbot-nginx unattended-upgrades ffmpeg ghostscript

echo "== Installing Node.js 22 =="
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

echo "== Creating deploy user and folders =="
id "$APP_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APP_USER"
mkdir -p "$APP_DIR/releases" "$APP_DIR/shared" "$UPLOAD_DIR" "/home/$APP_USER/.ssh"
touch "/home/$APP_USER/.ssh/authorized_keys"
chmod 700 "/home/$APP_USER/.ssh"; chmod 600 "/home/$APP_USER/.ssh/authorized_keys"
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$UPLOAD_DIR" "/home/$APP_USER/.ssh"
chmod 755 "$UPLOAD_DIR" "$APP_DIR"   # Nginx must be able to read uploaded files
touch /var/log/am-weekly-report.log; chown "$APP_USER:$APP_USER" /var/log/am-weekly-report.log

echo "== Swap file (safety for builds and traffic spikes) =="
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q swapfile /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

echo "== Firewall =="
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

echo "== PM2 start on reboot =="
su - "$APP_USER" -c "pm2 startup systemd -u $APP_USER --hp /home/$APP_USER" | tail -1 | bash || true

echo "== Weekly report cron (Friday 21:00 Pakistan time = 16:00 UTC) =="
CRON_LINE="0 16 * * 5 /var/www/am-international/current/deploy/weekly-report.sh"
( su - "$APP_USER" -c "crontab -l 2>/dev/null" | grep -v weekly-report.sh; echo "$CRON_LINE" ) | su - "$APP_USER" -c "crontab -"

echo
echo "Done. Next steps (see deploy/SERVER-SETUP.md):"
echo " 1. Put the GitHub deploy public key in /home/$APP_USER/.ssh/authorized_keys"
echo " 2. Create $APP_DIR/shared/.env from deploy/env.production.example"
echo " 3. Install the Nginx file and run certbot"
