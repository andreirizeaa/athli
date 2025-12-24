import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const code = requestUrl.searchParams.get('code');

  // Debug: Log all parameters
  console.log('=== AUTH CALLBACK DEBUG ===');
  console.log('Full URL:', requestUrl.toString());
  console.log('All params:', Object.fromEntries(requestUrl.searchParams.entries()));
  console.log('token_hash:', token_hash);
  console.log('type:', type);
  console.log('code:', code);
  console.log('========================');

  const cookieStore = await cookies();
  cookieStore.getAll();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore cookie errors in server components
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignore cookie errors in server components
          }
        },
      },
    }
  );

  // Handle email confirmation links (token_hash based)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (!error) {
      // Email change confirmed successfully
      return NextResponse.redirect(new URL('/home?refresh=true', request.url));
    } else {
      console.error('Error verifying email change:', error);
      return NextResponse.redirect(new URL('/auth/login?error=verification_failed', request.url));
    }
  }

  // Handle OAuth/PKCE flow (code based)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user already has a session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // For new Google OAuth users, set user_type if not already set
        if (!session.user.user_metadata?.user_type) {
          await supabase.auth.updateUser({
            data: {
              user_type: 'coach', // Default to coach for /auth registration
            }
          });
        }

        // Check if this was an email change
        const isEmailChange = requestUrl.searchParams.get('type') === 'email_change';
        if (isEmailChange) {
          return NextResponse.redirect(new URL('/home?refresh=true', request.url));
        }
      }

      // New login/signup or existing user
      return NextResponse.redirect(new URL('/home', request.url));
    } else {
      console.error('Error exchanging code for session:', error);
      // If code exchange fails but user has a session, might be email change
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Code exchange failed but user has session, treating as email change');
        return NextResponse.redirect(new URL('/home?refresh=true', request.url));
      }
      return NextResponse.redirect(new URL('/auth/login?error=oauth_failed', request.url));
    }
  }

  // No valid parameters
  return NextResponse.redirect(new URL('/auth/login?error=invalid_request', request.url));
}
