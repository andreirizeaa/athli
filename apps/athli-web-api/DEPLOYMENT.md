# Athli API — AWS EC2 + Cloudflare Deployment Guide

A step-by-step guide for deploying the Athli API to AWS EC2 instances across multiple regions (US + EU) with Cloudflare geo-routing so users are served from the closest server.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Local Development (Unchanged)](#2-local-development-unchanged)
3. [Docker — Building & Testing Locally](#3-docker--building--testing-locally)
4. [AWS Account Setup](#4-aws-account-setup)
5. [Create an ECR Repository (Container Registry)](#5-create-an-ecr-repository-container-registry)
6. [Launch EC2 Instances (US + EU)](#6-launch-ec2-instances-us--eu)
7. [Install Docker on EC2](#7-install-docker-on-ec2)
8. [SSL Certificates — Cloudflare Origin Certs](#8-ssl-certificates--cloudflare-origin-certs)
9. [Deploy to EC2](#9-deploy-to-ec2)
10. [Cloudflare Setup — Domain, DNS & SSL](#10-cloudflare-setup--domain-dns--ssl)
11. [Cloudflare Load Balancer — Geo-Routing](#11-cloudflare-load-balancer--geo-routing)
12. [Lock Down EC2 — Cloudflare-Only Security Group](#12-lock-down-ec2--cloudflare-only-security-group)
13. [Environment Variables & Secrets](#13-environment-variables--secrets)
14. [Deploying Updates](#14-deploying-updates)
15. [Monitoring & Maintenance](#15-monitoring--maintenance)
16. [Cost Breakdown](#16-cost-breakdown)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Architecture Overview

```
                 ┌─────────────────────────────┐
                 │         Cloudflare           │
                 │  Load Balancer (Geo-Steering)│
                 │     api.yourdomain.com       │
                 └──────────┬──────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │                            │
     US/NA Users                     EU Users
              │                            │
    ┌─────────▼──────────┐    ┌────────────▼─────────┐
    │   us-east-1 EC2    │    │   eu-west-1 EC2      │
    │  ┌──────────────┐  │    │  ┌──────────────┐    │
    │  │    Nginx      │  │    │  │    Nginx      │    │
    │  │   :443 SSL    │  │    │  │   :443 SSL    │    │
    │  └──────┬───────┘  │    │  └──────┬───────┘    │
    │  ┌──────▼───────┐  │    │  ┌──────▼───────┐    │
    │  │  athli-api    │  │    │  │  athli-api    │    │
    │  │   :3000       │  │    │  │   :3000       │    │
    │  └──────────────┘  │    │  └──────────────┘    │
    └────────────────────┘    └──────────────────────┘
              │                            │
              └────────────┬───────────────┘
                           │
                    ┌──────▼──────┐
                    │  Supabase   │
                    │ (Database)  │
                    └─────────────┘
```

**How it works:**
- Your domain (`api.yourdomain.com`) is managed by Cloudflare
- Cloudflare's Load Balancer uses **geo-steering** to route requests
- US/North American users → US EC2 instance
- European users → EU EC2 instance
- All other regions → fallback to US (or whichever you prefer)
- Each EC2 runs Nginx (SSL termination) → Docker container (Node.js API)
- Both regions connect to the same Supabase project

---

## 2. Local Development (Unchanged)

Nothing changes for local development. You still run:

```bash
cd apps/athli-web-api
npm install
npm run dev
```

This starts the dev server at `http://localhost:3002` with hot-reload via `ts-node-dev`. Docker is only used for production builds and deployment.

---

## 3. Docker — Building & Testing Locally

Before deploying, verify the Docker build works on your machine.

### 3.1 Build the Image

```bash
cd apps/athli-web-api
docker build -t athli-api .
```

### 3.2 Run It Locally

Create a `.env` file (or use your existing one), then:

```bash
docker run --rm -p 3000:3000 --env-file .env -e NODE_ENV=production athli-api
```

Visit `http://localhost:3000/health` — you should see `{"status":"ok"}`.

### 3.3 Using Docker Compose (Optional)

```bash
docker compose up --build
```

This builds and runs the API on port 3000. Press `Ctrl+C` to stop.

---

## 4. AWS Account Setup

### 4.1 Install the AWS CLI

If you don't have it yet:

```bash
# macOS
brew install awscli

# Or download from https://aws.amazon.com/cli/
```

### 4.2 Create an IAM User

1. Go to **AWS Console → IAM → Users → Create User**
2. Name: `athli-deploy`
3. Click **Next**
4. Select **Attach policies directly**
5. Attach these policies:
   - `AmazonEC2FullAccess`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonSSMReadOnlyAccess`
6. Click **Next → Create User**
7. Click the user → **Security credentials → Create access key**
8. Choose **Command Line Interface (CLI)**
9. Copy the **Access Key ID** and **Secret Access Key**

### 4.3 Configure CLI

```bash
aws configure
# AWS Access Key ID: <paste>
# AWS Secret Access Key: <paste>
# Default region name: us-east-1
# Default output format: json
```

---

## 5. Create an ECR Repository (Container Registry)

ECR stores your Docker images so both EC2 instances can pull them.

### 5.1 Via AWS Console

1. Go to **AWS Console → search "ECR" → Amazon Elastic Container Registry**
2. Click **Create repository**
3. Visibility: **Private**
4. Repository name: `athli-api`
5. Tag immutability: **Disabled** (so you can overwrite `latest`)
6. Click **Create repository**
7. Note the URI — it looks like: `123456789012.dkr.ecr.us-east-1.amazonaws.com/athli-api`

### 5.2 Enable Cross-Region Replication

This automatically copies images to `eu-west-1` when you push to `us-east-1`.

1. In ECR, click **Private registry** (left sidebar) → **Replication**
2. Click **Edit replication configuration**
3. Click **Add rule**
4. Destination region: `eu-west-1`
5. Click **Save**

Now every image pushed to `us-east-1` is automatically replicated to `eu-west-1`.

### 5.3 Push Your First Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build (from apps/athli-web-api/)
docker build -t athli-api .

# Tag
docker tag athli-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/athli-api:latest

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/athli-api:latest
```

Replace `123456789012` with your actual AWS account ID.

---

## 6. Launch EC2 Instances (US + EU)

You need one instance per region. Repeat these steps twice — once in `us-east-1` and once in `eu-west-1`.

### 6.1 Create a Key Pair

1. Go to **EC2 Console → Key Pairs** (left sidebar under Network & Security)
2. Click **Create key pair**
3. Name: `athli-key-us` (or `athli-key-eu` for the EU region)
4. Type: **RSA**
5. Format: **.pem**
6. Click **Create** — the `.pem` file downloads automatically
7. Secure it:
   ```bash
   chmod 400 ~/Downloads/athli-key-us.pem
   mv ~/Downloads/athli-key-us.pem ~/.ssh/
   ```

### 6.2 Create a Security Group

1. Go to **EC2 Console → Security Groups → Create security group**
2. Name: `athli-api-sg`
3. Description: `Athli API - Cloudflare + SSH access`
4. VPC: select your default VPC
5. **Inbound rules** (we'll lock these down to Cloudflare IPs later in [Step 12](#12-lock-down-ec2--cloudflare-only-security-group), for now allow all for setup):
   | Type  | Port | Source         | Description        |
   |-------|------|----------------|--------------------|
   | HTTPS | 443  | 0.0.0.0/0     | HTTPS (temp — will restrict to Cloudflare) |
   | SSH   | 22   | My IP          | SSH access         |
6. **Outbound rules**: Leave as default (all traffic allowed)
7. Click **Create security group**

### 6.3 Launch the Instance

1. Go to **EC2 Console → Instances → Launch instances**
2. **Name**: `athli-api-us` (or `athli-api-eu`)
3. **AMI**: Select **Amazon Linux 2023 AMI** (should be the first option, free tier eligible)
4. **Instance type**: `t3.small` (2 vCPUs, 2 GiB RAM — $15/mo)
   - For testing: `t3.micro` works but has only 1 GiB RAM
   - For better price/performance: `t4g.small` (Graviton/ARM, ~$12/mo) — make sure your Docker image supports ARM, which `node:20-alpine` does
5. **Key pair**: Select the key pair you created
6. **Network settings**: Click **Edit**
   - Select **existing security group** → pick `athli-api-sg`
7. **Configure storage**: 20 GiB gp3 (default is fine, 8 GiB is a bit tight with Docker images)
8. **Advanced details** → IAM instance profile:
   - If you created an IAM role for ECR access (see below), select it here
   - Otherwise, skip for now and configure later
9. Click **Launch instance**

### 6.4 Create an IAM Role for EC2 (for ECR Pull Access)

1. Go to **IAM → Roles → Create role**
2. Trusted entity type: **AWS service**
3. Use case: **EC2**
4. Click **Next**
5. Attach policies:
   - `AmazonEC2ContainerRegistryReadOnly`
   - `AmazonSSMReadOnlyAccess` (for Parameter Store secrets)
6. Name: `athli-ec2-role`
7. Click **Create role**
8. Go back to **EC2 → Instances → select your instance → Actions → Security → Modify IAM role**
9. Select `athli-ec2-role` → **Update IAM role**

### 6.5 Allocate an Elastic IP

1. Go to **EC2 Console → Elastic IPs → Allocate Elastic IP address**
2. Click **Allocate**
3. Select the new Elastic IP → **Actions → Associate Elastic IP address**
4. Instance: select your EC2 instance
5. Click **Associate**
6. **Write down this IP** — you'll need it for Cloudflare

> Repeat steps 6.1–6.5 in `eu-west-1` (switch region in the top-right corner of AWS Console).

---

## 7. Install Docker on EC2

SSH into each EC2 instance and run these commands.

### 7.1 Connect via SSH

```bash
# US instance
ssh -i ~/.ssh/athli-key-us.pem ec2-user@<US-ELASTIC-IP>

# EU instance
ssh -i ~/.ssh/athli-key-eu.pem ec2-user@<EU-ELASTIC-IP>
```

### 7.2 Install Docker & Docker Compose

```bash
# Update system
sudo dnf update -y

# Install Docker
sudo dnf install docker -y

# Start Docker and enable on boot
sudo systemctl enable --now docker

# Add ec2-user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker ec2-user

# Install Docker Compose v2 plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -sL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Apply group changes (or log out and back in)
newgrp docker

# Verify
docker --version
docker compose version
```

### 7.3 Configure Docker Daemon for Production

```bash
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "live-restore": true
}
EOF

sudo systemctl restart docker
```

The `live-restore` setting keeps containers running during Docker daemon restarts/upgrades.

---

## 8. SSL Certificates — Cloudflare Origin Certs

Cloudflare Origin Certificates provide free SSL between Cloudflare and your EC2 instances. They are only trusted by Cloudflare (not browsers), which is exactly what you want since all traffic comes through Cloudflare.

### 8.1 Generate the Certificate

1. Log into **Cloudflare Dashboard**
2. Select your domain
3. Go to **SSL/TLS → Origin Server**
4. Click **Create Certificate**
5. Settings:
   - Generate private key and CSR with Cloudflare: **Yes**
   - Key type: **RSA (2048)**
   - Hostnames: `yourdomain.com, *.yourdomain.com`
   - Certificate validity: **15 years** (the maximum — no renewal hassle)
6. Click **Create**
7. **IMMEDIATELY COPY BOTH:**
   - **Origin Certificate** (the long PEM block)
   - **Private Key** (the other long PEM block)

   > The private key is shown ONLY ONCE. If you lose it, you must generate a new certificate.

### 8.2 Install on Each EC2 Instance

SSH into each EC2 instance and save the certificate files:

```bash
# Create the deployment directory
sudo mkdir -p /opt/athli/nginx/certs

# Save the origin certificate
sudo nano /opt/athli/nginx/certs/origin.pem
# Paste the Origin Certificate, save (Ctrl+X, Y, Enter)

# Save the private key
sudo nano /opt/athli/nginx/certs/origin.key
# Paste the Private Key, save

# Lock down permissions
sudo chmod 600 /opt/athli/nginx/certs/origin.key
sudo chmod 644 /opt/athli/nginx/certs/origin.pem
sudo chown -R ec2-user:ec2-user /opt/athli
```

> Use the SAME certificate on both US and EU instances (it covers `*.yourdomain.com`).

---

## 9. Deploy to EC2

### 9.1 Prepare Deployment Files on EC2

On each EC2 instance, create the app directory and copy the config files:

```bash
mkdir -p /opt/athli/nginx/certs
```

You need to get these files onto each EC2 instance:
- `docker-compose.prod.yml` → `/opt/athli/docker-compose.prod.yml`
- `nginx/nginx.conf` → `/opt/athli/nginx/nginx.conf`
- `.env` → `/opt/athli/.env`
- Certs (from step 8) → `/opt/athli/nginx/certs/`

**Option A: SCP from your local machine**

```bash
# From your local machine, inside apps/athli-web-api/
scp -i ~/.ssh/athli-key-us.pem docker-compose.prod.yml ec2-user@<US-ELASTIC-IP>:/opt/athli/
scp -i ~/.ssh/athli-key-us.pem nginx/nginx.conf ec2-user@<US-ELASTIC-IP>:/opt/athli/nginx/
scp -i ~/.ssh/athli-key-us.pem .env ec2-user@<US-ELASTIC-IP>:/opt/athli/
```

**Option B: Git clone on EC2**

```bash
# On EC2
cd /opt/athli
git clone <your-repo-url> repo
cp repo/apps/athli-web-api/docker-compose.prod.yml .
cp repo/apps/athli-web-api/nginx/nginx.conf nginx/
# Create .env manually (don't commit secrets to git)
```

### 9.2 Create the .env File

```bash
nano /opt/athli/.env
```

Add your environment variables:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your-google-client-secret

# Intercom
NEXT_PUBLIC_INTERCOM_SECRET_KEY=your-intercom-key

# CORS — your frontend URL(s), comma-separated
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# Swagger (optional — protects /api-docs in production)
SWAGGER_PASSWORD=a-strong-password
```

Lock it down:

```bash
chmod 600 /opt/athli/.env
```

### 9.3 Pull and Start

```bash
cd /opt/athli

# Login to ECR (use the correct region per instance)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Set the image reference
export ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com/athli-api
export IMAGE_TAG=latest

# Pull and start
docker compose -f docker-compose.prod.yml up -d
```

### 9.4 Verify

```bash
# Check containers are running
docker compose -f docker-compose.prod.yml ps

# Check API health (internally)
curl http://localhost:3000/health
# Should return: {"status":"ok"}

# Check Nginx is serving HTTPS
curl -k https://localhost/health
# Should return: {"status":"ok"}
# (-k skips cert validation since the origin cert isn't browser-trusted)
```

> Repeat steps 9.1–9.4 on the EU instance (use `eu-west-1` for the ECR registry).

---

## 10. Cloudflare Setup — Domain, DNS & SSL

### 10.1 Add Your Domain to Cloudflare

If your domain isn't on Cloudflare yet:

1. Go to **Cloudflare Dashboard → Add a site**
2. Enter your domain
3. Select the **Free** plan (the load balancer is a separate add-on)
4. Cloudflare will scan existing DNS records
5. Update your domain registrar's nameservers to the ones Cloudflare provides
6. Wait for propagation (can take up to 24 hours, usually faster)

### 10.2 Set SSL Mode to Full (Strict)

1. In Cloudflare, select your domain
2. Go to **SSL/TLS → Overview**
3. Set encryption mode to **Full (strict)**

This ensures Cloudflare validates the origin certificate on your EC2 instances. Without this, traffic between Cloudflare and your server could be intercepted.

### 10.3 Recommended SSL/TLS Settings

Go to **SSL/TLS → Edge Certificates** and enable:

| Setting | Value | Why |
|---------|-------|-----|
| Always Use HTTPS | On | Redirects HTTP → HTTPS |
| Minimum TLS Version | TLS 1.2 | Modern security baseline |
| Opportunistic Encryption | On | Additional encryption layer |
| TLS 1.3 | On | Faster handshakes |
| Automatic HTTPS Rewrites | On | Fixes mixed content |

---

## 11. Cloudflare Load Balancer — Geo-Routing

This is the core of the multi-region setup. Cloudflare's Load Balancer routes users to the closest server based on their geographic location.

### 11.1 Enable Load Balancing

1. In Cloudflare, select your domain
2. Go to **Traffic → Load Balancing**
3. Click **Enable Load Balancing**
4. You'll be prompted to subscribe:
   - Base: **$5/month** (2 origins, 60s health checks)
   - Geo Steering add-on: **$10/month**
   - **Total: $15/month**

### 11.2 Create a Health Monitor

1. Go to **Traffic → Load Balancing → Monitors**
2. Click **Create monitor**
3. Configure:
   | Setting | Value |
   |---------|-------|
   | Type | HTTPS |
   | Path | `/health` |
   | Interval | 60 seconds |
   | Timeout | 5 seconds |
   | Retries | 2 |
   | Expected Codes | 200 |
   | Follow Redirects | No |
   | Header: Host | `api.yourdomain.com` |
4. Click **Save**

### 11.3 Create Origin Pools

**US Pool:**

1. Go to **Traffic → Load Balancing → Pools**
2. Click **Create pool**
3. Configure:
   | Setting | Value |
   |---------|-------|
   | Pool name | `us-pool` |
   | Endpoint name | `us-east-1` |
   | Endpoint address | `<US Elastic IP>` |
   | Weight | 1 |
   | Monitor | Select the monitor from step 11.2 |
   | Health Check Regions | Eastern North America |
   | Notification email | your-email@example.com |
4. Click **Save**

**EU Pool:**

1. Click **Create pool** again
2. Configure:
   | Setting | Value |
   |---------|-------|
   | Pool name | `eu-pool` |
   | Endpoint name | `eu-west-1` |
   | Endpoint address | `<EU Elastic IP>` |
   | Weight | 1 |
   | Monitor | Same monitor |
   | Health Check Regions | Western Europe |
   | Notification email | your-email@example.com |
3. Click **Save**

### 11.4 Create the Load Balancer with Geo-Steering

1. Go to **Traffic → Load Balancing → Load Balancers**
2. Click **Create load balancer**
3. **Hostname**: `api` (this creates `api.yourdomain.com`)
4. **Proxy status**: Enabled (orange cloud — ON)
5. Click **Next**

6. **Add Origin Pools:**
   - Add `us-pool`
   - Add `eu-pool`
   - Set **Fallback Pool**: `us-pool`
   - Click **Next**

7. **Traffic Steering:**
   - Select **Geo Steering**
   - Configure region mapping:

   | Cloudflare Region | Pool |
   |-------------------|------|
   | Eastern North America | `us-pool` |
   | Western North America | `us-pool` |
   | Western Europe | `eu-pool` |
   | Eastern Europe | `eu-pool` |

   All other regions (Asia, South America, Africa, Oceania) will use the **Fallback Pool** (`us-pool`).

8. Click **Next**, review the summary, then **Save and Deploy**

### 11.5 Verify Geo-Routing

Test from different locations using:

```bash
# Check which server responds (add X-Origin header in your API if you want to distinguish)
curl -s https://api.yourdomain.com/health

# Check Cloudflare headers
curl -sI https://api.yourdomain.com/health | grep -i cf-
```

You can also use online tools like https://check-host.net or https://www.uptrends.com/tools/ping-test to test from different geographic locations.

---

## 12. Lock Down EC2 — Cloudflare-Only Security Group

Once Cloudflare is working, restrict your EC2 instances to ONLY accept traffic from Cloudflare IPs. This prevents attackers from bypassing Cloudflare and hitting your servers directly.

### 12.1 Via AWS Console

1. Go to **EC2 → Security Groups → select `athli-api-sg`**
2. Click **Inbound rules → Edit inbound rules**
3. **Delete** the `0.0.0.0/0` rule on port 443
4. **Add** a new rule for each Cloudflare IPv4 range:

   | Type | Port | Source | Description |
   |------|------|--------|-------------|
   | HTTPS | 443 | 173.245.48.0/20 | Cloudflare |
   | HTTPS | 443 | 103.21.244.0/22 | Cloudflare |
   | HTTPS | 443 | 103.22.200.0/22 | Cloudflare |
   | HTTPS | 443 | 103.31.4.0/22 | Cloudflare |
   | HTTPS | 443 | 141.101.64.0/18 | Cloudflare |
   | HTTPS | 443 | 108.162.192.0/18 | Cloudflare |
   | HTTPS | 443 | 190.93.240.0/20 | Cloudflare |
   | HTTPS | 443 | 188.114.96.0/20 | Cloudflare |
   | HTTPS | 443 | 197.234.240.0/22 | Cloudflare |
   | HTTPS | 443 | 198.41.128.0/17 | Cloudflare |
   | HTTPS | 443 | 162.158.0.0/15 | Cloudflare |
   | HTTPS | 443 | 104.16.0.0/13 | Cloudflare |
   | HTTPS | 443 | 104.24.0.0/14 | Cloudflare |
   | HTTPS | 443 | 172.64.0.0/13 | Cloudflare |
   | HTTPS | 443 | 131.0.72.0/22 | Cloudflare |

5. Keep your SSH rule (`port 22`, `My IP`)
6. Click **Save rules**

### 12.2 Via AWS CLI (Automated Script)

Run this from your local machine:

```bash
SG_ID="sg-your-security-group-id"
REGION="us-east-1"  # repeat for eu-west-1

# Add Cloudflare IPv4 ranges
for cidr in $(curl -s https://www.cloudflare.com/ips-v4); do
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 443 \
    --cidr "$cidr" \
    --region "$REGION" 2>/dev/null
done

# Add Cloudflare IPv6 ranges
for cidr in $(curl -s https://www.cloudflare.com/ips-v6); do
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --ip-permissions "IpProtocol=tcp,FromPort=443,ToPort=443,Ipv6Ranges=[{CidrIpv6=$cidr,Description=Cloudflare}]" \
    --region "$REGION" 2>/dev/null
done
```

> **Important:** Cloudflare occasionally updates their IP ranges. Check https://www.cloudflare.com/ips/ periodically and update your security group rules.

---

## 13. Environment Variables & Secrets

### 13.1 Simple Approach — .env File on EC2

For getting started, a `.env` file on the EC2 instance (as set up in step 9.2) works fine. Make sure:

- File permissions are `600` (only the owner can read/write)
- It is NOT committed to git
- You maintain a copy somewhere secure (password manager, encrypted notes)

### 13.2 Better Approach — AWS Systems Manager Parameter Store

Store secrets in AWS Parameter Store (free for Standard parameters) and pull them at deploy time.

**Store a secret:**

```bash
aws ssm put-parameter \
  --name "/athli/production/SUPABASE_SERVICE_ROLE_KEY" \
  --value "your-secret-here" \
  --type SecureString \
  --region us-east-1
```

**Store all your secrets (repeat for each):**

```bash
aws ssm put-parameter --name "/athli/production/SUPABASE_URL" --value "https://xxx.supabase.co" --type SecureString --region us-east-1
aws ssm put-parameter --name "/athli/production/SUPABASE_SERVICE_ROLE_KEY" --value "..." --type SecureString --region us-east-1
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_GOOGLE_CLIENT_ID" --value "..." --type SecureString --region us-east-1
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_GOOGLE_CLIENT_SECRET" --value "..." --type SecureString --region us-east-1
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_INTERCOM_SECRET_KEY" --value "..." --type SecureString --region us-east-1
aws ssm put-parameter --name "/athli/production/CORS_ORIGIN" --value "https://yourdomain.com" --type String --region us-east-1
aws ssm put-parameter --name "/athli/production/SWAGGER_PASSWORD" --value "..." --type SecureString --region us-east-1
```

**Generate .env from Parameter Store on EC2:**

Create a deploy helper script on each EC2 instance:

```bash
cat > /opt/athli/generate-env.sh << 'SCRIPT'
#!/bin/bash
# Generate .env from AWS Parameter Store
echo "NODE_ENV=production" > /opt/athli/.env
echo "PORT=3000" >> /opt/athli/.env
echo "LOG_LEVEL=info" >> /opt/athli/.env

aws ssm get-parameters-by-path \
  --path "/athli/production/" \
  --with-decryption \
  --query "Parameters[*].[Name,Value]" \
  --output text \
  --region us-east-1 \
  | while read name value; do
      key=$(basename "$name")
      echo "${key}=${value}" >> /opt/athli/.env
    done

chmod 600 /opt/athli/.env
echo "✓ .env generated from Parameter Store"
SCRIPT

chmod +x /opt/athli/generate-env.sh
```

Then run `/opt/athli/generate-env.sh` before starting the containers.

> For the EU instance, replicate the parameters to `eu-west-1` or point the script to `us-east-1` (cross-region SSM access works but is slower).

---

## 14. Deploying Updates

When you push new code, here's the process to deploy it.

### 14.1 Build & Push to ECR (from your local machine or CI)

```bash
cd apps/athli-web-api

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t 123456789012.dkr.ecr.us-east-1.amazonaws.com/athli-api:latest .
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/athli-api:latest
```

The image automatically replicates to `eu-west-1` via ECR replication (set up in step 5.2).

### 14.2 Deploy to Each EC2 Instance

SSH into each instance and run:

```bash
cd /opt/athli

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Pull the new image and restart
export ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com/athli-api
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Clean up old images
docker image prune -f
```

### 14.3 Automated Deployment (GitHub Actions)

Add this workflow to your repo at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]
    paths:
      - 'apps/athli-web-api/**'

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: athli-api

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          cd apps/athli-web-api
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:${{ github.sha }} \
                       -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:${{ github.sha }}
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  deploy-us:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to US EC2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_US_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            aws ecr get-login-password --region us-east-1 | \
              docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}
            cd /opt/athli
            export ECR_REGISTRY=${{ secrets.ECR_REGISTRY }}/athli-api
            export IMAGE_TAG=latest
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f

  deploy-eu:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to EU EC2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_EU_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            aws ecr get-login-password --region eu-west-1 | \
              docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY_EU }}
            cd /opt/athli
            export ECR_REGISTRY=${{ secrets.ECR_REGISTRY_EU }}/athli-api
            export IMAGE_TAG=latest
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f
```

**GitHub Secrets to configure:**

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM deploy user access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM deploy user secret key |
| `ECR_REGISTRY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `ECR_REGISTRY_EU` | `123456789012.dkr.ecr.eu-west-1.amazonaws.com` |
| `EC2_US_HOST` | US Elastic IP |
| `EC2_EU_HOST` | EU Elastic IP |
| `EC2_SSH_KEY` | Contents of your .pem private key |

---

## 15. Monitoring & Maintenance

### 15.1 Check Container Status (on EC2)

```bash
# View running containers
docker compose -f docker-compose.prod.yml ps

# View logs (last 100 lines, follow)
docker compose -f docker-compose.prod.yml logs --tail 100 -f

# View logs for API only
docker compose -f docker-compose.prod.yml logs --tail 100 -f api

# Check container resource usage
docker stats
```

### 15.2 CloudWatch Monitoring (Optional)

Install the CloudWatch agent for memory/disk metrics:

```bash
# Install
sudo dnf install amazon-cloudwatch-agent -y

# Quick setup
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
# Follow the prompts (select: EC2, Linux, yes to memory/disk metrics)

# Start
sudo systemctl enable --now amazon-cloudwatch-agent
```

### 15.3 CloudWatch Alarms

In the AWS Console:

1. Go to **CloudWatch → Alarms → Create alarm**
2. Recommended alarms:
   - **CPU Utilization > 80%** for 5 minutes → sends email
   - **Status Check Failed** → sends email (instance health)
3. Under **Notification**, create an SNS topic with your email

### 15.4 System Updates

```bash
# Check for updates
sudo dnf check-update

# Apply security updates
sudo dnf update --security -y

# Full update (schedule during maintenance window)
sudo dnf update -y
sudo reboot
```

Run security updates at least weekly. The Docker containers are unaffected by OS updates (except during reboot).

### 15.5 Docker Image Updates

Rebuild and push your image monthly (even without code changes) to pick up security patches in the `node:20-alpine` base image:

```bash
docker build --no-cache -t athli-api .
```

---

## 16. Cost Breakdown

### Monthly Estimates (USD)

| Service | Per Region | Total (2 Regions) |
|---------|-----------|-------------------|
| EC2 t3.small (on-demand) | $15 | $30 |
| Elastic IP | $3.60 | $7.20 |
| ECR storage (~200MB image) | $0.02 | $0.04 |
| EBS (20 GiB gp3) | $1.60 | $3.20 |
| Data transfer (first 100GB/mo free) | $0 | $0 |
| **AWS Subtotal** | | **~$40** |
| Cloudflare Free plan | | $0 |
| Cloudflare Load Balancer + Geo | | $15 |
| **Grand Total** | | **~$55/month** |

### Ways to Save

- **Reserved Instances**: Commit to 1 year → ~35% savings (~$20/mo instead of $30 for 2x t3.small)
- **Graviton (t4g)**: ~20% cheaper than t3 for equivalent specs
- **Spot Instances**: Up to 90% cheaper, but can be interrupted (not recommended for API servers)

---

## 17. Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Common issues:
# - Missing environment variables → check .env file
# - Port conflict → check nothing else is using port 3000
# - Image not found → verify ECR login and image tag
```

### 502 Bad Gateway from Cloudflare

This means Cloudflare can reach your server but Nginx can't reach the API container.

```bash
# Check if API container is healthy
docker compose -f docker-compose.prod.yml ps
# Look for "healthy" status

# Check Nginx can reach the API
docker compose -f docker-compose.prod.yml exec nginx wget -qO- http://api:3000/health
```

### 521 Error from Cloudflare

Cloudflare can't connect to your origin at all.

1. Verify Elastic IP is correct in Cloudflare pool
2. Check security group allows Cloudflare IPs on port 443
3. Verify Nginx is listening: `docker compose -f docker-compose.prod.yml ps` — nginx should show `0.0.0.0:443->443/tcp`
4. Test directly: `curl -k https://<ELASTIC-IP>/health`

### 526 Error from Cloudflare

Invalid SSL certificate on origin.

1. Verify SSL mode is **Full (strict)** in Cloudflare
2. Check certificate files exist: `ls -la /opt/athli/nginx/certs/`
3. Verify certificate content: `openssl x509 -in /opt/athli/nginx/certs/origin.pem -text -noout`
4. Check Nginx SSL config: `docker compose -f docker-compose.prod.yml exec nginx nginx -t`

### Health checks failing in Cloudflare

1. Check the monitor path is `/health` (not `/api/health`)
2. Verify the host header matches your domain
3. Test the health endpoint directly: `curl -k https://<ELASTIC-IP>/health`
4. Check Nginx access logs: `docker compose -f docker-compose.prod.yml logs nginx`

### Can't SSH into EC2

1. Verify your IP hasn't changed (update security group SSH rule with "My IP")
2. Check the key pair: `ssh -i ~/.ssh/athli-key-us.pem -v ec2-user@<IP>`
3. Instance may be in a private subnet → needs to be in a public subnet with an internet gateway
