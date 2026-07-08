import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Protect everything inside /dashboard
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // 1. Ensure user is signed in
    await auth.protect();
    
    // 2. Ensure they are operating within a Business context (Organization)
    const { orgId } = await auth();
    
    // If accessing the dashboard without an active organization context, 
    // redirect them to an org selection/creation page
    if (!orgId && !req.nextUrl.pathname.startsWith('/dashboard/select-business')) {
      return NextResponse.redirect(new URL('/dashboard/select-business', req.url));
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
