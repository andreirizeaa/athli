import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/((?!_next|api|favicon.ico|.*\\..*|$).*)']);

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes except root (which redirects)
  if (isProtectedRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      // Check if we just came from www with redirect flag (prevent redirect loops)
      const url = new URL(req.url);
      const redirectFlag = url.searchParams.get('__www_redirect');
      
      // If we have the redirect flag, it means we just came from www
      // Don't redirect back immediately to prevent loops
      // Instead, let the request through - the layout will handle it with a retry
      if (redirectFlag === 'true') {
        // Set a custom header so the layout knows to wait longer
        const response = NextResponse.next();
        response.headers.set('x-from-www-redirect', 'true');
        // Let the request through to layout (which will retry auth check)
        return response;
      }

      // Redirect to www site instead of Clerk's sign-in
      const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000';
      return NextResponse.redirect(new URL(wwwUrl, req.url));
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
