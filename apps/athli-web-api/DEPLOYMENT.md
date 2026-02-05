# Athli API — AWS EC2 + Cloudflare Deployment Guide

This guide is split into two phases:

- **Phase 1 (now):** Deploy to a single EU EC2 instance with Cloudflare (free plan) for DNS, SSL, and DDoS protection. Cost: ~$20/month AWS (covered by credits) + $0 Cloudflare.
- **Phase 2 (later):** Add a US EC2 instance and enable Cloudflare Load Balancer with geo-steering so EU users hit the EU server and US users hit the US server. Additional cost: ~$20/month AWS + $15/month Cloudflare.

---

## Table of Contents

### Phase 1 — Single EU Region

1. [Architecture Overview (Phase 1)](#1-architecture-overview-phase-1)
2. [Local Development (Unchanged)](#2-local-development-unchanged)
3. [Docker — Building & Testing Locally](#3-docker--building--testing-locally)
4. [AWS Account Setup & Budget Alert](#4-aws-account-setup--budget-alert)
5. [Create an ECR Repository (Container Registry)](#5-create-an-ecr-repository-container-registry)
6. [Launch the EU EC2 Instance](#6-launch-the-eu-ec2-instance)
7. [Install Docker on EC2](#7-install-docker-on-ec2)
8. [Cloudflare Setup — Domain, DNS & SSL](#8-cloudflare-setup--domain-dns--ssl)
9. [SSL Certificates — Cloudflare Origin Certs](#9-ssl-certificates--cloudflare-origin-certs)
10. [Deploy to EC2](#10-deploy-to-ec2)
11. [Lock Down EC2 — Cloudflare-Only Security Group](#11-lock-down-ec2--cloudflare-only-security-group)
12. [Environment Variables & Secrets](#12-environment-variables--secrets)
13. [Deploying Updates](#13-deploying-updates)
14. [Monitoring & Maintenance](#14-monitoring--maintenance)
15. [Troubleshooting](#15-troubleshooting)

### Phase 2 — Add US Region + Geo-Routing

16. [Architecture Overview (Phase 2)](#16-architecture-overview-phase-2)
17. [Launch the US EC2 Instance](#17-launch-the-us-ec2-instance)
18. [Enable ECR Cross-Region Replication](#18-enable-ecr-cross-region-replication)
19. [Deploy to the US Instance](#19-deploy-to-the-us-instance)
20. [Cloudflare Load Balancer — Geo-Routing](#20-cloudflare-load-balancer--geo-routing)
21. [Update GitHub Actions for Both Regions](#21-update-github-actions-for-both-regions)
22. [Cost Breakdown (Both Phases)](#22-cost-breakdown-both-phases)

---

# Phase 1 — Single EU Region

---

## 1. Architecture Overview (Phase 1)

```
            ┌──────────────────────┐
            │     Cloudflare       │
            │   (Free Plan DNS +   │
            │    SSL + Proxy)      │
            │  api.yourdomain.com  │
            └──────────┬───────────┘
                       │
              All users (worldwide)
                       │
            ┌──────────▼───────────┐
            │   eu-west-1 EC2      │
            │  ┌────────────────┐  │
            │  │     Nginx      │  │
            │  │   :443 SSL     │  │
            │  └───────┬────────┘  │
            │  ┌───────▼────────┐  │
            │  │   athli-api    │  │
            │  │    :3000       │  │
            │  └────────────────┘  │
            └──────────────────────┘
                       │
                ┌──────▼──────┐
                │  Supabase   │
                │ (Database)  │
                └─────────────┘
```

**How it works:**
- Your domain (`api.yourdomain.com`) is managed by Cloudflare (free plan)
- Cloudflare proxies all traffic, providing SSL, DDoS protection, and hides your server IP
- All users worldwide hit the single EU EC2 instance in `eu-west-1` (Ireland)
- EC2 runs Nginx (SSL termination) → Docker container (Node.js API)
- The API connects to your Supabase project

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

## 4. AWS Account Setup & Budget Alert

### 4.1 Set Up a Budget Alert (Do This First)

Before anything else, protect yourself from surprise charges:

1. Go to **AWS Console → Billing → Budgets**
2. Click **Create budget**
3. Select **Cost budget**
4. Set monthly amount: **$30** (Phase 1 should be ~$20, so $30 gives headroom)
5. Add an alert at **80%** ($24) — enter your email
6. Click **Create budget**

### 4.2 Install the AWS CLI

```bash
# macOS
brew install awscli

# Or download from https://aws.amazon.com/cli/
```

### 4.3 Create an IAM User

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

### 4.4 Configure CLI

```bash
aws configure
# AWS Access Key ID: <paste>
# AWS Secret Access Key: <paste>
# Default region name: eu-west-1
# Default output format: json
```

> Note: We set `eu-west-1` as the default since that's your primary region.

---

## 5. Create an ECR Repository (Container Registry)

ECR stores your Docker images so your EC2 instance can pull them.

### 5.1 Via AWS Console

1. **Switch to eu-west-1** in the top-right corner of the AWS Console
2. Go to **AWS Console → search "ECR" → Amazon Elastic Container Registry**
3. Click **Create repository**
4. Visibility: **Private**
5. Repository name: `athli-api`
6. Tag immutability: **Disabled** (so you can overwrite `latest`)
7. Click **Create repository**
8. Note the URI — it looks like: `123456789012.dkr.ecr.eu-west-1.amazonaws.com/athli-api`

> Replace `123456789012` with your actual AWS account ID throughout this guide.

### 5.2 Push Your First Image

```bash
# Login to ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.eu-west-1.amazonaws.com

# Build (from apps/athli-web-api/)
cd apps/athli-web-api
docker build -t athli-api .

# Tag
docker tag athli-api:latest 123456789012.dkr.ecr.eu-west-1.amazonaws.com/athli-api:latest

# Push
docker push 123456789012.dkr.ecr.eu-west-1.amazonaws.com/athli-api:latest
```

---

## 6. Launch the EU EC2 Instance

### 6.1 Create a Key Pair

1. Make sure you're in the **eu-west-1** region (top-right corner)
2. Go to **EC2 Console → Key Pairs** (left sidebar under Network & Security)
3. Click **Create key pair**
4. Name: `athli-key-eu`
5. Type: **RSA**
6. Format: **.pem**
7. Click **Create** — the `.pem` file downloads automatically
8. Secure it:
   ```bash
   chmod 400 ~/Downloads/athli-key-eu.pem
   mv ~/Downloads/athli-key-eu.pem ~/.ssh/
   ```

### 6.2 Create a Security Group

1. Go to **EC2 Console → Security Groups → Create security group**
2. Name: `athli-api-sg`
3. Description: `Athli API - Cloudflare + SSH access`
4. VPC: select your default VPC
5. **Inbound rules** (we'll lock these down to Cloudflare IPs in [Step 11](#11-lock-down-ec2--cloudflare-only-security-group), for now allow all HTTPS for setup):

   | Type  | Port | Source     | Description                              |
   |-------|------|------------|------------------------------------------|
   | HTTPS | 443  | 0.0.0.0/0 | HTTPS (temporary — will restrict later)  |
   | SSH   | 22   | My IP      | SSH access                               |

6. **Outbound rules**: Leave as default (all traffic allowed)
7. Click **Create security group**

### 6.3 Create an IAM Role for EC2 (for ECR Pull Access)

Do this before launching the instance so you can attach it at launch:

1. Go to **IAM → Roles → Create role**
2. Trusted entity type: **AWS service**
3. Use case: **EC2**
4. Click **Next**
5. Attach policies:
   - `AmazonEC2ContainerRegistryReadOnly`
   - `AmazonSSMReadOnlyAccess` (for Parameter Store secrets later)
6. Name: `athli-ec2-role`
7. Click **Create role**

### 6.4 Launch the Instance

1. Go to **EC2 Console → Instances → Launch instances**
2. **Name**: `athli-api-eu`
3. **AMI**: Select **Amazon Linux 2023 AMI** (first option, free tier eligible)
4. **Instance type**: `t3.small` (2 vCPUs, 2 GiB RAM — ~$15/mo)
   - Alternative: `t4g.small` (Graviton/ARM, ~$12/mo) — `node:20-alpine` supports ARM
5. **Key pair**: Select `athli-key-eu`
6. **Network settings**: Click **Edit**
   - Select **existing security group** → pick `athli-api-sg`
7. **Configure storage**: 20 GiB gp3
8. **Advanced details** → IAM instance profile: Select `athli-ec2-role`
9. Click **Launch instance**

### 6.5 Allocate an Elastic IP

1. Go to **EC2 Console → Elastic IPs → Allocate Elastic IP address**
2. Click **Allocate**
3. Select the new Elastic IP → **Actions → Associate Elastic IP address**
4. Instance: select `athli-api-eu`
5. Click **Associate**
6. **Write down this IP** — you'll need it for Cloudflare (e.g., `52.xx.xx.xx`)

---

## 7. Install Docker on EC2

### 7.1 Connect via SSH

```bash
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

## 8. Cloudflare Setup — Domain, DNS & SSL

Do this before generating origin certs (step 9), since you need Cloudflare managing your domain first.

### 8.1 Add Your Domain to Cloudflare

If your domain isn't on Cloudflare yet:

1. Go to **Cloudflare Dashboard → Add a site**
2. Enter your domain (e.g., `yourdomain.com`)
3. Select the **Free** plan
4. Cloudflare will scan existing DNS records — review and confirm
5. Cloudflare gives you two nameservers (e.g., `ada.ns.cloudflare.com`, `chad.ns.cloudflare.com`)
6. Go to your **domain registrar** (GoDaddy, Namecheap, etc.) → update nameservers to the Cloudflare ones
7. Back in Cloudflare, click **Check nameservers**
8. Wait for propagation (usually minutes, can take up to 24 hours)

### 8.2 Create a DNS Record for Your API

1. In Cloudflare, go to **DNS → Records**
2. Click **Add record**
3. Configure:

   | Field   | Value                  |
   |---------|------------------------|
   | Type    | A                      |
   | Name    | `api`                  |
   | IPv4    | `<your EU Elastic IP>` |
   | Proxy   | **Proxied** (orange cloud ON) |
   | TTL     | Auto                   |

4. Click **Save**

This creates `api.yourdomain.com` pointing to your EC2 instance through Cloudflare's proxy.

### 8.3 Set SSL Mode to Full (Strict)

1. Go to **SSL/TLS → Overview**
2. Set encryption mode to **Full (strict)**

This ensures Cloudflare validates the origin certificate on your EC2 instance.

### 8.4 Recommended SSL/TLS Settings

Go to **SSL/TLS → Edge Certificates** and enable:

| Setting                   | Value  | Why                           |
|---------------------------|--------|-------------------------------|
| Always Use HTTPS          | On     | Redirects HTTP → HTTPS        |
| Minimum TLS Version       | TLS 1.2| Modern security baseline      |
| Opportunistic Encryption  | On     | Additional encryption layer   |
| TLS 1.3                   | On     | Faster handshakes             |
| Automatic HTTPS Rewrites  | On     | Fixes mixed content           |

---

## 9. SSL Certificates — Cloudflare Origin Certs

Cloudflare Origin Certificates provide free SSL between Cloudflare and your EC2 instance. They're only trusted by Cloudflare (not browsers), which is exactly what you want since all traffic comes through Cloudflare.

### 9.1 Generate the Certificate

1. In Cloudflare, select your domain
2. Go to **SSL/TLS → Origin Server**
3. Click **Create Certificate**
4. Settings:
   - Generate private key and CSR with Cloudflare: **Yes**
   - Key type: **RSA (2048)**
   - Hostnames: `yourdomain.com, *.yourdomain.com`
   - Certificate validity: **15 years** (maximum — no renewal needed)
5. Click **Create**
6. **IMMEDIATELY COPY BOTH:**
   - **Origin Certificate** (the long PEM block)
   - **Private Key** (the other long PEM block)

   > The private key is shown **ONLY ONCE**. If you lose it, you must generate a new certificate. Save both in a password manager.

### 9.2 Install on the EC2 Instance

SSH into your EC2 instance:

```bash
ssh -i ~/.ssh/athli-key-eu.pem ec2-user@<EU-ELASTIC-IP>
```

Save the certificate files:

```bash
# Create the directory
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

---

## 10. Deploy to EC2

### 10.1 Prepare Deployment Files on EC2

You need to get these files onto your EC2 instance:
- `docker-compose.prod.yml` → `/opt/athli/docker-compose.prod.yml`
- `nginx/nginx.conf` → `/opt/athli/nginx/nginx.conf`
- `.env` → `/opt/athli/.env`
- Certs (from step 9) → already at `/opt/athli/nginx/certs/`

**Option A: SCP from your local machine**

```bash
# From your local machine, inside apps/athli-web-api/
scp -i ~/.ssh/athli-key-eu.pem docker-compose.prod.yml ec2-user@<EU-ELASTIC-IP>:/opt/athli/
scp -i ~/.ssh/athli-key-eu.pem nginx/nginx.conf ec2-user@<EU-ELASTIC-IP>:/opt/athli/nginx/
```

**Option B: Git clone on EC2**

```bash
# On EC2
cd /opt/athli
git clone <your-repo-url> repo
cp repo/apps/athli-web-api/docker-compose.prod.yml .
cp repo/apps/athli-web-api/nginx/nginx.conf nginx/
```

### 10.2 Create the .env File

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

### 10.3 Pull and Start

```bash
cd /opt/athli

# Login to ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.eu-west-1.amazonaws.com

# Set the image reference
export ECR_REGISTRY=123456789012.dkr.ecr.eu-west-1.amazonaws.com/athli-api
export IMAGE_TAG=latest

# Pull and start
docker compose -f docker-compose.prod.yml up -d
```

### 10.4 Verify

```bash
# Check containers are running
docker compose -f docker-compose.prod.yml ps
# Both 'athli-api' and 'athli-nginx' should show as running/healthy

# Check API health (internally, bypassing Nginx)
curl http://localhost:3000/health
# Should return: {"status":"ok"}

# Check Nginx is serving HTTPS
curl -k https://localhost/health
# Should return: {"status":"ok"}
# (-k skips cert validation since the origin cert isn't browser-trusted)
```

Now test via Cloudflare (from your local machine, not EC2):

```bash
curl https://api.yourdomain.com/health
# Should return: {"status":"ok"}
```

If this works, your API is live and served through Cloudflare.

---

## 11. Lock Down EC2 — Cloudflare-Only Security Group

Now that Cloudflare is working, restrict your EC2 instance to ONLY accept traffic from Cloudflare IPs. This prevents attackers from bypassing Cloudflare and hitting your server directly.

### 11.1 Via AWS Console

1. Go to **EC2 → Security Groups → select `athli-api-sg`**
2. Click **Inbound rules → Edit inbound rules**
3. **Delete** the `0.0.0.0/0` rule on port 443
4. **Add** a new rule for each Cloudflare IPv4 range:

   | Type  | Port | Source            | Description |
   |-------|------|-------------------|-------------|
   | HTTPS | 443  | 173.245.48.0/20   | Cloudflare  |
   | HTTPS | 443  | 103.21.244.0/22   | Cloudflare  |
   | HTTPS | 443  | 103.22.200.0/22   | Cloudflare  |
   | HTTPS | 443  | 103.31.4.0/22     | Cloudflare  |
   | HTTPS | 443  | 141.101.64.0/18   | Cloudflare  |
   | HTTPS | 443  | 108.162.192.0/18  | Cloudflare  |
   | HTTPS | 443  | 190.93.240.0/20   | Cloudflare  |
   | HTTPS | 443  | 188.114.96.0/20   | Cloudflare  |
   | HTTPS | 443  | 197.234.240.0/22  | Cloudflare  |
   | HTTPS | 443  | 198.41.128.0/17   | Cloudflare  |
   | HTTPS | 443  | 162.158.0.0/15    | Cloudflare  |
   | HTTPS | 443  | 104.16.0.0/13     | Cloudflare  |
   | HTTPS | 443  | 104.24.0.0/14     | Cloudflare  |
   | HTTPS | 443  | 172.64.0.0/13     | Cloudflare  |
   | HTTPS | 443  | 131.0.72.0/22     | Cloudflare  |

5. **Keep** your SSH rule (`port 22`, `My IP`)
6. Click **Save rules**

### 11.2 Via AWS CLI (Automated Script)

```bash
SG_ID="sg-your-security-group-id"
REGION="eu-west-1"

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

> **Important:** Cloudflare occasionally updates their IP ranges. Check https://www.cloudflare.com/ips/ periodically and update your security group.

---

## 12. Environment Variables & Secrets

### 12.1 Simple Approach — .env File on EC2

The `.env` file you created in step 10.2 works for getting started. Make sure:

- File permissions are `600` (only the owner can read/write)
- It is NOT committed to git
- You keep a copy in a password manager

### 12.2 Better Approach — AWS Systems Manager Parameter Store

Store secrets encrypted in Parameter Store (free) and pull them at deploy time:

**Store your secrets:**

```bash
aws ssm put-parameter --name "/athli/production/SUPABASE_URL" --value "https://xxx.supabase.co" --type SecureString --region eu-west-1
aws ssm put-parameter --name "/athli/production/SUPABASE_SERVICE_ROLE_KEY" --value "..." --type SecureString --region eu-west-1
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_GOOGLE_CLIENT_ID" --value "..." --type SecureString --region eu-west-1
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_GOOGLE_CLIENT_SECRET" --value "..." --type SecureString --region eu-west-1
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_INTERCOM_SECRET_KEY" --value "..." --type SecureString --region eu-west-1
aws ssm put-parameter --name "/athli/production/CORS_ORIGIN" --value "https://yourdomain.com" --type String --region eu-west-1
aws ssm put-parameter --name "/athli/production/SWAGGER_PASSWORD" --value "..." --type SecureString --region eu-west-1
```

**Create a helper script on EC2 to generate .env from Parameter Store:**

```bash
cat > /opt/athli/generate-env.sh << 'SCRIPT'
#!/bin/bash
echo "NODE_ENV=production" > /opt/athli/.env
echo "PORT=3000" >> /opt/athli/.env
echo "LOG_LEVEL=info" >> /opt/athli/.env

aws ssm get-parameters-by-path \
  --path "/athli/production/" \
  --with-decryption \
  --query "Parameters[*].[Name,Value]" \
  --output text \
  --region eu-west-1 \
  | while read name value; do
      key=$(basename "$name")
      echo "${key}=${value}" >> /opt/athli/.env
    done

chmod 600 /opt/athli/.env
echo "Done — .env generated from Parameter Store"
SCRIPT

chmod +x /opt/athli/generate-env.sh
```

Then run `/opt/athli/generate-env.sh` before starting containers.

---

## 13. Deploying Updates

### 13.1 Manual Deploy (Build & Push from Your Machine)

```bash
cd apps/athli-web-api

# Login to ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.eu-west-1.amazonaws.com

# Build and push
docker build -t 123456789012.dkr.ecr.eu-west-1.amazonaws.com/athli-api:latest .
docker push 123456789012.dkr.ecr.eu-west-1.amazonaws.com/athli-api:latest
```

Then SSH into EC2 and pull:

```bash
cd /opt/athli
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.eu-west-1.amazonaws.com

export ECR_REGISTRY=123456789012.dkr.ecr.eu-west-1.amazonaws.com/athli-api
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Clean up old images
docker image prune -f
```

### 13.2 Automated Deploy (GitHub Actions)

Add this workflow to `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]
    paths:
      - 'apps/athli-web-api/**'

env:
  AWS_REGION: eu-west-1
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
              docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}
            cd /opt/athli
            export ECR_REGISTRY=${{ secrets.ECR_REGISTRY }}/athli-api
            export IMAGE_TAG=latest
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f
```

**GitHub Secrets to configure** (Settings → Secrets and variables → Actions):

| Secret                  | Value                                               |
|-------------------------|-----------------------------------------------------|
| `AWS_ACCESS_KEY_ID`     | Your IAM deploy user access key                     |
| `AWS_SECRET_ACCESS_KEY` | Your IAM deploy user secret key                     |
| `ECR_REGISTRY`          | `123456789012.dkr.ecr.eu-west-1.amazonaws.com`      |
| `EC2_EU_HOST`           | Your EU Elastic IP                                  |
| `EC2_SSH_KEY`           | Contents of your `athli-key-eu.pem` file            |

---

## 14. Monitoring & Maintenance

### 14.1 Check Container Status (on EC2)

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

### 14.2 CloudWatch Monitoring (Optional)

Install the CloudWatch agent for memory/disk metrics:

```bash
sudo dnf install amazon-cloudwatch-agent -y
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
# Follow prompts: EC2, Linux, yes to memory/disk metrics
sudo systemctl enable --now amazon-cloudwatch-agent
```

### 14.3 CloudWatch Alarms

1. Go to **CloudWatch → Alarms → Create alarm**
2. Recommended alarms:
   - **CPU Utilization > 80%** for 5 minutes → sends email
   - **Status Check Failed** → sends email
3. Under **Notification**, create an SNS topic with your email

### 14.4 System Updates

```bash
# Apply security updates (run weekly)
sudo dnf update --security -y

# Full update (schedule during low-traffic window)
sudo dnf update -y
sudo reboot
```

Docker containers are unaffected by OS updates except during reboot.

### 14.5 Docker Image Updates

Rebuild and push your image monthly (even without code changes) to pick up security patches in the `node:20-alpine` base image:

```bash
docker build --no-cache -t athli-api .
```

---

## 15. Troubleshooting

### Container won't start

```bash
docker compose -f docker-compose.prod.yml logs api

# Common issues:
# - Missing environment variables → check .env file
# - Port conflict → check nothing else uses port 3000
# - Image not found → verify ECR login and image tag
```

### 502 Bad Gateway from Cloudflare

Cloudflare reached your server but Nginx can't reach the API container.

```bash
# Check if API container is healthy
docker compose -f docker-compose.prod.yml ps

# Test Nginx → API connectivity
docker compose -f docker-compose.prod.yml exec nginx wget -qO- http://api:3000/health
```

### 521 Error from Cloudflare

Cloudflare can't connect to your origin at all.

1. Verify Elastic IP is correct in Cloudflare DNS record
2. Check security group allows Cloudflare IPs on port 443
3. Verify Nginx is running: `docker compose -f docker-compose.prod.yml ps`
4. Test directly: `curl -k https://<ELASTIC-IP>/health`

### 526 Error from Cloudflare

Invalid SSL certificate.

1. Verify SSL mode is **Full (strict)** in Cloudflare
2. Check cert files exist: `ls -la /opt/athli/nginx/certs/`
3. Verify cert: `openssl x509 -in /opt/athli/nginx/certs/origin.pem -text -noout`
4. Test Nginx config: `docker compose -f docker-compose.prod.yml exec nginx nginx -t`

### Health check passes but API returns errors

```bash
# Check API logs for application errors
docker compose -f docker-compose.prod.yml logs --tail 200 api | grep -i error

# Verify environment variables are loaded
docker compose -f docker-compose.prod.yml exec api env | sort
```

### Can't SSH into EC2

1. Your IP may have changed → update security group SSH rule with "My IP"
2. Debug: `ssh -i ~/.ssh/athli-key-eu.pem -v ec2-user@<IP>`
3. Instance must be in a public subnet with an internet gateway

---

# Phase 2 — Add US Region + Geo-Routing

> Do this when you have US users experiencing noticeable latency, or when you want the experience of setting up multi-region.

---

## 16. Architecture Overview (Phase 2)

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

Cloudflare's Load Balancer uses **geo-steering** to route:
- US/North American users → US EC2 instance
- European users → EU EC2 instance (your existing one)
- All other regions → fallback pool (your choice)

---

## 17. Launch the US EC2 Instance

Follow the same steps as [Step 6](#6-launch-the-eu-ec2-instance), but in the **us-east-1** region:

1. **Switch region** to `us-east-1` (N. Virginia) in the top-right corner of AWS Console
2. **Create a key pair**: Name it `athli-key-us`
3. **Create a security group**: Same rules as the EU one (name it `athli-api-sg-us`)
4. **Attach IAM role**: You need to create `athli-ec2-role` in this region too (IAM roles are global, but instance profiles are region-scoped — you can reuse the same IAM role)
5. **Launch instance**: Same specs as EU (`t3.small`, Amazon Linux 2023, 20 GiB)
6. **Allocate an Elastic IP** and associate it
7. **Install Docker** on the instance (same as [Step 7](#7-install-docker-on-ec2))
8. **Install the same SSL certs** (same Cloudflare origin cert works for both — it covers `*.yourdomain.com`)

**Write down the US Elastic IP** — you'll need it for Cloudflare.

---

## 18. Enable ECR Cross-Region Replication

This automatically copies Docker images from `eu-west-1` to `us-east-1` so both instances can pull the same image.

### Via AWS Console

1. Go to **ECR** (in `eu-west-1`, your primary region)
2. Click **Private registry** (left sidebar) → **Replication**
3. Click **Edit replication configuration**
4. Click **Add rule**
5. Destination region: `us-east-1`
6. Click **Save**

Now every image pushed to `eu-west-1` ECR automatically replicates to `us-east-1`. The repository is created in the destination region automatically.

### Via CLI

```bash
aws ecr put-replication-configuration --replication-configuration '{
  "rules": [{
    "destinations": [{
      "region": "us-east-1",
      "registryId": "123456789012"
    }]
  }]
}' --region eu-west-1
```

---

## 19. Deploy to the US Instance

Same process as [Step 10](#10-deploy-to-ec2) but on the US instance:

1. SCP the config files (`docker-compose.prod.yml`, `nginx/nginx.conf`)
2. Install SSL certs (same ones from step 9)
3. Create `.env` (same values — or generate from Parameter Store)
4. Pull and start:

```bash
cd /opt/athli

# Login to ECR (us-east-1 — the replicated copy)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

export ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com/athli-api
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml up -d
```

Verify: `curl -k https://localhost/health`

5. **Lock down the US security group** to Cloudflare IPs (same as [Step 11](#11-lock-down-ec2--cloudflare-only-security-group) but for the US security group)

---

## 20. Cloudflare Load Balancer — Geo-Routing

This is the core of multi-region. Cloudflare routes users to the closest server based on geography.

### 20.1 Enable Load Balancing

1. In Cloudflare, select your domain
2. Go to **Traffic → Load Balancing**
3. Click **Enable Load Balancing**
4. Subscribe:
   - Base: **$5/month** (2 origins, 60s health checks)
   - Geo Steering: **$10/month**
   - **Total: $15/month**

### 20.2 Create a Health Monitor

1. Go to **Traffic → Load Balancing → Monitors**
2. Click **Create monitor**
3. Configure:

   | Setting         | Value                 |
   |-----------------|-----------------------|
   | Type            | HTTPS                 |
   | Path            | `/health`             |
   | Interval        | 60 seconds            |
   | Timeout         | 5 seconds             |
   | Retries         | 2                     |
   | Expected Codes  | 200                   |
   | Follow Redirects| No                    |
   | Header: Host    | `api.yourdomain.com`  |

4. Click **Save**

### 20.3 Create Origin Pools

**EU Pool:**

1. Go to **Traffic → Load Balancing → Pools**
2. Click **Create pool**

   | Setting              | Value                       |
   |----------------------|-----------------------------|
   | Pool name            | `eu-pool`                   |
   | Endpoint name        | `eu-west-1`                 |
   | Endpoint address     | `<EU Elastic IP>`           |
   | Weight               | 1                           |
   | Monitor              | Select the monitor above    |
   | Health Check Regions | Western Europe              |
   | Notification email   | your-email@example.com      |

3. Click **Save**

**US Pool:**

1. Click **Create pool** again

   | Setting              | Value                       |
   |----------------------|-----------------------------|
   | Pool name            | `us-pool`                   |
   | Endpoint name        | `us-east-1`                 |
   | Endpoint address     | `<US Elastic IP>`           |
   | Weight               | 1                           |
   | Monitor              | Same monitor                |
   | Health Check Regions | Eastern North America       |
   | Notification email   | your-email@example.com      |

2. Click **Save**

### 20.4 Create the Load Balancer with Geo-Steering

1. Go to **Traffic → Load Balancing → Load Balancers**
2. Click **Create load balancer**
3. **Hostname**: `api` (this becomes `api.yourdomain.com`)
   > This **replaces** the A record you created in step 8.2. Cloudflare will prompt you — confirm the replacement.
4. **Proxy status**: Enabled (orange cloud ON)
5. Click **Next**

6. **Add Origin Pools:**
   - Add `eu-pool`
   - Add `us-pool`
   - Set **Fallback Pool**: `eu-pool` (your existing primary)
   - Click **Next**

7. **Traffic Steering:**
   - Select **Geo Steering**
   - Configure region mapping:

   | Cloudflare Region         | Pool      |
   |---------------------------|-----------|
   | Eastern North America     | `us-pool` |
   | Western North America     | `us-pool` |
   | Western Europe            | `eu-pool` |
   | Eastern Europe            | `eu-pool` |

   All unmapped regions (Asia, South America, Africa, Oceania) use the **Fallback Pool** (`eu-pool`).

8. Click **Next**, review, then **Save and Deploy**

### 20.5 Verify Geo-Routing

```bash
# From your machine
curl -sI https://api.yourdomain.com/health | grep -i cf-
```

Use online tools to test from different locations:
- https://check-host.net
- https://www.uptrends.com/tools/ping-test

If a region's pool goes down, Cloudflare automatically fails over to the other pool.

---

## 21. Update GitHub Actions for Both Regions

Update your `.github/workflows/deploy.yml` to deploy to both instances:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]
    paths:
      - 'apps/athli-web-api/**'

env:
  AWS_REGION: eu-west-1
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
              docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}
            cd /opt/athli
            export ECR_REGISTRY=${{ secrets.ECR_REGISTRY }}/athli-api
            export IMAGE_TAG=latest
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f

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
              docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY_US }}
            cd /opt/athli
            export ECR_REGISTRY=${{ secrets.ECR_REGISTRY_US }}/athli-api
            export IMAGE_TAG=latest
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f
```

**Additional GitHub Secrets for Phase 2:**

| Secret              | Value                                              |
|---------------------|----------------------------------------------------|
| `EC2_US_HOST`       | US Elastic IP                                      |
| `ECR_REGISTRY_US`   | `123456789012.dkr.ecr.us-east-1.amazonaws.com`     |

---

## 22. Cost Breakdown (Both Phases)

### Phase 1 — Single EU Region

| Service                           | Monthly Cost |
|-----------------------------------|-------------|
| EC2 t3.small (eu-west-1)         | ~$15        |
| Elastic IP                        | ~$3.60      |
| EBS 20 GiB gp3                   | ~$1.60      |
| ECR storage                       | ~$0.25      |
| Cloudflare (free plan)            | $0          |
| **Phase 1 Total**                 | **~$20/month** |

### Phase 2 — Add US Region + Geo-Routing

| Service                           | Additional Cost |
|-----------------------------------|----------------|
| EC2 t3.small (us-east-1)         | ~$15           |
| Elastic IP                        | ~$3.60         |
| EBS 20 GiB gp3                   | ~$1.60         |
| ECR replication                   | ~$0.25         |
| Cloudflare Load Balancer + Geo    | $15            |
| **Phase 2 Additional**            | **~$35/month** |
| **Combined Total (Phase 1 + 2)**  | **~$55/month** |

### Ways to Save

- **Graviton (t4g.small)**: ~20% cheaper than t3 (~$12/instance instead of $15)
- **Reserved Instances (1 year)**: ~35% savings on EC2
- **Stop instances when not needed**: EC2 charges stop when the instance is stopped (EBS storage still charges ~$1.60/mo)
