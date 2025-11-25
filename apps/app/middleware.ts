import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/((?!_next|api|favicon.ico|.*\\..*|$).*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes except root (which redirects)
  if (isProtectedRoute(req)) {
    const { userId } = await auth()
    
    if (!userId) {
      // Redirect to www site instead of Clerk's sign-in
      const wwwUrl = process.env.NODE_ENV === 'production' 
        ? 'https://oneninety.com'
        : 'http://localhost:3000'
      return NextResponse.redirect(new URL(wwwUrl, req.url))
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
}
