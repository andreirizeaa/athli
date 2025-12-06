# Deploying to Render

This guide will help you deploy the Express API to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. Your environment variables ready

## Option 1: Deploy via Render Dashboard (Recommended)

### Step 1: Create a New Web Service

1. Go to your Render dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository and branch

### Step 2: Configure the Service

**Basic Settings:**
- **Name**: `api` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `apps/api`

**Build & Deploy:**
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`

### Step 3: Environment Variables

Add these environment variables in the Render dashboard:

**Required:**
```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=https://your-frontend-domain.com
```

**Clerk:**
```
CLERK_SECRET_KEY=your_clerk_secret_key
```

**Supabase:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Google OAuth:**
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Intercom:**
```
NEXT_PUBLIC_INTERCOM_SECRET_KEY=your_intercom_secret_key
```

**Microsoft OAuth (if needed):**
```
NEXT_PUBLIC_AZURE_CLIENT_ID=your_azure_client_id
NEXT_PUBLIC_AZURE_CLIENT_SECRET=your_azure_client_secret
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy your service
3. Your API will be available at: `https://your-service-name.onrender.com`

## Post-Deployment

### Update Frontend API URL

Update your Next.js app's `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-service-name.onrender.com/api/v1
```

### Health Check

Test your deployment:
```
curl https://your-service-name.onrender.com/health
```

Should return: `{"status":"ok"}`

### API Documentation

Access Swagger UI at:
```
https://your-service-name.onrender.com/api-docs
```

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify `npm ci` works locally
- Check build logs in Render dashboard

### CORS Errors
- Ensure `CORS_ORIGIN` is set to your exact frontend URL (no trailing slash)
- For multiple origins, update CORS config to accept an array

### Environment Variables Not Working
- Make sure all variables are set in Render dashboard
- Restart the service after adding new variables
- Check variable names match exactly (case-sensitive)

### Service Crashes
- Check logs in Render dashboard
- Verify all required environment variables are set
- Ensure PORT is set to 3000 (or Render's assigned port)

## Render-Specific Notes

- Render provides a free tier with automatic SSL
- Services sleep after 15 minutes of inactivity (free tier)
- Consider upgrading for always-on service
- Use Render's PostgreSQL if you need a database later

