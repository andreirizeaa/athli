import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
const restrictedAuthRoutes = ['/auth/reset-password', '/auth/verify-email'];
// OAuth callback must be publicly accessible for OAuth providers to redirect to
const oauthCallbackRoutes = ['/auth/callback'];

export function middleware(request: NextRequest) {
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

  // Allow all other routes through - client-side auth will handle redirects
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
