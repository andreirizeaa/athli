import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  
  // Support both Google format (provider_token) and Outlook format (access_token)
  const accessToken = body.provider_access_token || body.access_token;
  const refreshToken = body.provider_refresh_token || body.refresh_token;
  const provider = body.provider;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: 'Missing NEXT_PUBLIC_SUPABASE_URL' },
      { status: 500 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    );
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
  }

  if (!provider) {
    return NextResponse.json({ error: 'Missing provider' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Set expiration to 1 hour (Google tokens are typically valid for 1 hour)
  // The refresh token is long-lived and can be used to get new access tokens
  const tokenExpiresAt = new Date(Date.now() + 3600 * 1000);

  // Store the actual Google/Microsoft provider tokens
  const { error } = await supabase.from('user_email_accounts').upsert({
    clerk_user_id: userId,
    provider: provider === 'azure' ? 'outlook' : provider,
    provider_account_id: '', // Can be extracted from token if needed
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokenExpiresAt,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

