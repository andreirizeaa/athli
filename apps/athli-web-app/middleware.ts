import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/client/invite',  // Client invite pages (public)
  '/coach/referral', // Coach referral pages (public)
];
const restrictedAuthRoutes = ['/auth/reset-password'];
// OAuth callback must be publicly accessible for OAuth providers to redirect to
const oauthCallbackRoutes = ['/auth/callback'];
// Routes that require authentication
const protectedRoutes = ['/home', '/athletes', '/training', '/forms', '/todo', '/inbox', '/settings'];
// Download routes that require authentication but are accessible after auth flow
const downloadRoutes = ['/download'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow OAuth callback routes (needed for Google OAuth redirect)
  if (oauthCallbackRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Block direct access to restricted auth routes
  // These should only be accessible via navigation from other auth flows
  if (restrictedAuthRoutes.some((route) => pathname.startsWith(route))) {
    const referer = request.headers.get('referer');
    const origin = request.nextUrl.origin;

    // Allow if coming from the same app (internal navigation)
    // Block if no referer (direct access) or external referer
    if (!referer || !referer.startsWith(origin)) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Handle download routes - require authentication but allow after auth flow
  const isDownloadRoute = downloadRoutes.some((route) => pathname.startsWith(route));

  // Check authentication for protected routes (including download routes)
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route)) || pathname === '/' || isDownloadRoute;

  if (isProtectedRoute) {
    // Create a response to pass to the Supabase client
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    const { data: { user } } = await supabase.auth.getUser();

    // If no user and trying to access protected route, redirect to login
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    return response;
  }

  // Allow all other routes through
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
