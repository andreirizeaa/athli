#!/bin/bash
set -e

REGION="eu-west-1"

echo "Adding parameters to AWS Parameter Store..."

# Supabase
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_SUPABASE_URL" --value "https://bxgbbpiswmauqdqkkaha.supabase.co" --type String --region $REGION --overwrite
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_SUPABASE_KEY" --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2JicGlzd21hdXFkcWtrYWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDEzMTUsImV4cCI6MjA3OTMxNzMxNX0.N-7o5MjkqrxP8L51DT1Zk_rssY1LsX92X1UPsE1WfnI" --type String --region $REGION --overwrite
aws ssm put-parameter --name "/athli/production/SUPABASE_SERVICE_ROLE_KEY" --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2JicGlzd21hdXFkcWtrYWhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc0MTMxNSwiZXhwIjoyMDc5MzE3MzE1fQ.Aii_EdYrDWF1kZye1HzqwS0xjM4yZQBkYYfLrlLEnZw" --type SecureString --region $REGION --overwrite

# Google OAuth
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_GOOGLE_CLIENT_ID" --value "678116485718-r21l4n703drhpb42ae7i5oi1k1av44ou.apps.googleusercontent.com" --type String --region $REGION --overwrite
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_GOOGLE_CLIENT_SECRET" --value "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" --type SecureString --region $REGION --overwrite

# Intercom
aws ssm put-parameter --name "/athli/production/NEXT_PUBLIC_INTERCOM_SECRET_KEY" --value "mohGnDpRjvbrjeYfZ5wpxRR5hBSPO2mB5JTOtW-kBAc" --type SecureString --region $REGION --overwrite

# Swagger
aws ssm put-parameter --name "/athli/production/SWAGGER_PASSWORD" --value "admindocs" --type SecureString --region $REGION --overwrite

# Resend
aws ssm put-parameter --name "/athli/production/RESEND_API_KEY" --value "re_iyL89QuE_DK1tFK3J51wE4YnWR2AB8d3J" --type SecureString --region $REGION --overwrite

# MuscleWiki
aws ssm put-parameter --name "/athli/production/MUSCLEWIKI_API_KEY" --value "9aa24c88bemsh2f98d194f14738ap1666b8jsn73d42228d408" --type SecureString --region $REGION --overwrite
aws ssm put-parameter --name "/athli/production/MUSCLEWIKI_API_HOST" --value "musclewiki-api.p.rapidapi.com" --type String --region $REGION --overwrite

# CORS & App URL
aws ssm put-parameter --name "/athli/production/CORS_ORIGIN" --value "http://localhost:3000,http://localhost:3001,https://app.tryathli.com" --type String --region $REGION --overwrite
aws ssm put-parameter --name "/athli/production/WEB_APP_URL" --value "https://app.tryathli.com" --type String --region $REGION --overwrite

# Cache
aws ssm put-parameter --name "/athli/production/CACHE_POPULATE_SERVICE_TOKEN" --value "populate-cache-secret-04f3554187bd3da58859c810f25e7adf" --type SecureString --region $REGION --overwrite

# LangChain
aws ssm put-parameter --name "/athli/production/LANGCHAIN_API_KEY" --value "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" --type SecureString --region $REGION --overwrite
aws ssm put-parameter --name "/athli/production/LANGCHAIN_TRACING_V2" --value "true" --type String --region $REGION --overwrite
aws ssm put-parameter --name "/athli/production/LANGCHAIN_PROJECT" --value "athli-ai-assistant" --type String --region $REGION --overwrite

# OpenRouter
aws ssm put-parameter --name "/athli/production/OPENROUTER_API_KEY" --value "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" --type SecureString --region $REGION --overwrite

# Stripe
aws ssm put-parameter --name "/athli/production/STRIPE_SECRET_KEY" --value "pk_live_51SzDPqHD2SF3VWGzGKEjHwCdu10XcSyvgCu3XmnPjEsgPDHn6MhjPDS11rMwAYFEE2hHxSDEyoAolakgNVKz3gfm00vl2hi1Y4" --type SecureString --region $REGION --overwrite
aws ssm put-parameter --name "/athli/production/STRIPE_WEBHOOK_SECRET" --value "whsec_iw7wfxzSm1eOcKBY5SBdpDNRwG0A31Mv" --type SecureString --region $REGION --overwrite
aws ssm put-parameter --name "/athli/production/STRIPE_PLATFORM_WEBHOOK_SECRET" --value "whsec_DsiDffTVAHjYpmDy0r6seSijtFahlZAv" --type SecureString --region $REGION --overwrite

echo "Done! Added all parameters to Parameter Store."
