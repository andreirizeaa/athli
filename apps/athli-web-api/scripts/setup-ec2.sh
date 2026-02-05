#!/bin/bash
# ──────────────────────────────────────────────────────────
# EC2 first-time setup script
#
# Run this once on a fresh Amazon Linux 2023 EC2 instance.
# It installs Docker, Docker Compose, and prepares /opt/athli.
#
# Usage:
#   chmod +x setup-ec2.sh
#   ./setup-ec2.sh
# ──────────────────────────────────────────────────────────

set -euo pipefail

echo "==> Updating system packages..."
sudo dnf update -y

echo "==> Installing Docker..."
sudo dnf install docker -y
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

echo "==> Installing Docker Compose v2..."
sudo mkdir -p /usr/local/lib/docker/cli-plugins
ARCH=$(uname -m)
sudo curl -sL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

echo "==> Configuring Docker daemon..."
sudo tee /etc/docker/daemon.json > /dev/null <<'DAEMON'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "live-restore": true
}
DAEMON
sudo systemctl restart docker

echo "==> Creating /opt/athli directory structure..."
sudo mkdir -p /opt/athli/nginx/certs
sudo chown -R ec2-user:ec2-user /opt/athli

echo "==> Verifying installation..."
docker --version
docker compose version

echo ""
echo "============================================"
echo " EC2 setup complete!"
echo ""
echo " Next steps:"
echo "   1. Log out and back in (for docker group)"
echo "   2. Copy docker-compose.prod.yml to /opt/athli/"
echo "   3. Copy nginx/nginx.conf to /opt/athli/nginx/"
echo "   4. Add SSL certs to /opt/athli/nginx/certs/"
echo "   5. Create /opt/athli/.env"
echo "============================================"
