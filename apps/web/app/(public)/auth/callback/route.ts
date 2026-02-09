import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const code = requestUrl.searchParams.get('code');

  // Check for error parameters from Supabase
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const errorCode = requestUrl.searchParams.get('error_code');

  // Debug: Log all parameters
  console.log('=== AUTH CALLBACK DEBUG ===');
  console.log('Full URL:', requestUrl.toString());
  console.log('All params:', Object.fromEntries(requestUrl.searchParams.entries()));
  console.log('token_hash:', token_hash);
  console.log('type:', type);
  console.log('code:', code);
  console.log('error:', error);
  console.log('errorDescription:', errorDescription);
  console.log('========================');

  // If Supabase returned an error, handle based on verification type
  if (error) {
    // For email_change verification, the email is already changed in the backend
    // Just redirect to login without showing an error
    if (type === 'email_change') {
      console.log('Email change verification - redirecting to login (email was changed)');
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // For other errors, forward to login page with error details
    const errorParams = new URLSearchParams();
    errorParams.set('error', error);
    if (errorDescription) errorParams.set('error_description', errorDescription);
    if (errorCode) errorParams.set('error_code', errorCode);
    return NextResponse.redirect(new URL(`/auth/login?${errorParams.toString()}`, request.url));
  }

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
        const coachId = requestUrl.searchParams.get('coach_id');
        const flow = requestUrl.searchParams.get('flow');
        let redirectPath = requestUrl.searchParams.get('redirect') || '/home';

        // For new Google OAuth users, set user_type based on context
        console.log('=== CHECKING USER_TYPE ===');
        console.log('session.user.user_metadata:', JSON.stringify(session.user.user_metadata, null, 2));
        console.log('session.user.user_metadata?.user_type:', session.user.user_metadata?.user_type);

        let userType = session.user.user_metadata?.user_type;

        if (!userType) {
          userType = coachId ? 'client' : 'coach';
          console.log('=== CALLING updateUser with user_type:', userType, '===');

          const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            data: {
              user_type: userType,
              ...(coachId && { coach_id: coachId }),
            }
          });

          if (updateError) {
            console.error('updateUser ERROR:', updateError);
          } else {
            console.log('updateUser SUCCESS:', JSON.stringify(updateData, null, 2));
          }

          // Profile creation is handled by the database trigger (on_auth_user_updated)
          // which fires when user_type is set via updateUser()

          // Generate default avatar if user doesn't have one (Apple, etc.)
          // Fire-and-forget to avoid blocking the redirect
          (async () => {
            try {
              // Small delay to let the trigger complete
              await new Promise(resolve => setTimeout(resolve, 300));

              const { data: { session: currentSession } } = await supabase.auth.getSession();
              const hasPicture = currentSession?.user.user_metadata?.avatar_url ||
                                currentSession?.user.user_metadata?.picture;

              if (!hasPicture) {
                console.log('=== No OAuth profile picture, generating default avatar ===');
                // Call backend to generate avatar
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
                const apiVersion = process.env.NEXT_PUBLIC_API_VERSION || 'api/v1';
                const userName = currentSession?.user.user_metadata?.name ||
                                currentSession?.user.user_metadata?.full_name ||
                                currentSession?.user.email?.split('@')[0] || 'User';

                const response = await fetch(`${apiBaseUrl}/${apiVersion}/user/generate-avatar`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSession?.access_token}`,
                  },
                  body: JSON.stringify({
                    userId: currentSession?.user.id,
                    userName: userName,
                  }),
                });

                if (response.ok) {
                  console.log('=== Avatar generated successfully ===');
                } else {
                  console.error('Failed to generate avatar:', await response.text());
                }
              }
            } catch (avatarError) {
              console.error('Error generating avatar:', avatarError);
              // Don't fail the authentication flow if avatar generation fails
            }
          })();
        } else {
          console.log('=== SKIPPING updateUser - user_type already set ===');
        }

        // Check if this was an email change
        const isEmailChange = requestUrl.searchParams.get('type') === 'email_change';
        if (isEmailChange) {
          return NextResponse.redirect(new URL('/home?refresh=true', request.url));
        }

        // Check if this is a client invite flow (OAuth from client invite page)
        // Redirect to new-client page to complete profile creation with invitation token
        if (flow === 'client_invite' && userType === 'client') {
          console.log('=== Client invite OAuth flow, redirecting to /auth/new-client ===');
          return NextResponse.redirect(new URL('/auth/new-client', request.url));
        }

        // Check user type and redirect accordingly
        // If user is a client (not a coach), redirect to download page
        console.log('=== REDIRECT DECISION ===');
        console.log('userType:', userType);
        console.log('coachId:', coachId);
        console.log('flow:', flow);
        console.log('current redirectPath:', redirectPath);

        if (userType === 'client') {
          console.log('=== User is client-only, redirecting to /download/client ===');
          redirectPath = '/download/client';
        } else {
          console.log('=== User is coach, seeding demo data ===');
          // Seed demo data for coaches (idempotent - only creates if doesn't exist)
          try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
            const apiVersion = process.env.NEXT_PUBLIC_API_VERSION || 'api/v1';
            const seedResponse = await fetch(`${apiBaseUrl}/${apiVersion}/user/seed-demo-data`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
            });
            if (seedResponse.ok) {
              console.log('=== Demo data seeded successfully ===');
            } else {
              console.error('Failed to seed demo data:', await seedResponse.text());
            }
          } catch (seedError) {
            console.error('Error seeding demo data:', seedError);
            // Don't block auth flow if seeding fails
          }
          console.log('=== User is coach, using redirectPath:', redirectPath, '===');
        }

        console.log('=== FINAL REDIRECT ===');
        console.log('Final redirectPath:', redirectPath);
        console.log('========================');

        // Redirect to specified path
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }

      // New login/signup or existing user
      const redirectPath = requestUrl.searchParams.get('redirect') || '/home';
      return NextResponse.redirect(new URL(redirectPath, request.url));
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

