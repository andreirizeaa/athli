import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isProtectedRoute = createRouteMatcher(['/((?!_next|api|favicon.ico|.*\\..*|$).*)']);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes (sign-in, sign-up)
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (isProtectedRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      // Redirect to sign-in page
      const signInUrl = new URL('/sign-in', req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
