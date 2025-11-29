# Calendar OAuth Setup Instructions

## Fixing redirect_uri_mismatch Error

The `redirect_uri_mismatch` error occurs when the redirect URI in the OAuth request doesn't match what's configured in your OAuth provider.

### Important: Supabase OAuth Flow

When using Supabase OAuth:
1. **Supabase** makes the OAuth request to Google/Microsoft
2. Google/Microsoft redirects back to **Supabase's callback URL**
3. Supabase processes the OAuth and redirects to **your app's callback URL**

### Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID**
5. Under **Authorized redirect URIs**, add:
   ```
   https://bxgbbpiswmauqdqkkaha.supabase.co/auth/v1/callback
   ```
6. **Important**: Make sure there are no trailing slashes or extra characters
7. Click **Save**

### Step 2: Configure Microsoft Azure (for Outlook)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Select your app registration
4. Go to **Authentication**
5. Under **Redirect URIs**, click **Add a platform** → **Web**
6. Add:
   ```
   https://bxgbbpiswmauqdqkkaha.supabase.co/auth/v1/callback
   ```
7. Click **Save**

### Step 3: Configure Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add your app's callback URL:
   - For development: `http://localhost:3001/calendar/callback`
   - For production: `https://your-domain.com/calendar/callback`
5. Click **Save**

### Step 4: Verify Environment Variables

Make sure you have these set in your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://bxgbbpiswmauqdqkkaha.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 5: Wait for Propagation

After making changes:
- Wait 2-5 minutes for changes to propagate
- Clear your browser cache
- Try the connection again

### Troubleshooting

If you still get the error:

1. **Check the exact error message** - it should show what redirect_uri was sent
2. **Verify the Supabase callback URL** matches exactly (no trailing slash, correct protocol)
3. **Check Supabase logs** in the dashboard to see what's happening
4. **Verify your OAuth app credentials** are correct in Supabase dashboard:
   - Go to **Authentication** → **Providers** → **Google** (or **Azure**)
   - Make sure Client ID and Client Secret are correct

### Common Issues

- **Trailing slash**: `https://example.com/callback/` ≠ `https://example.com/callback`
- **Protocol mismatch**: `http://` ≠ `https://`
- **Port numbers**: `localhost:3001` ≠ `localhost:3000`
- **Subdomain**: `www.example.com` ≠ `example.com`

