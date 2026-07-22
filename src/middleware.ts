import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Protect everything inside /dashboard
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Webhooks are verified via Svix signatures, not Clerk sessions.
  // Bypassing middleware here prevents Next.js/Clerk header parsing bugs with svix-cli.
  if (req.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    // 1. Ensure user is signed in
    await auth.protect();
    
    // 2. Ensure they are operating within a Business context (Organization)
    const { orgId, orgRole } = await auth();
    
    // Only apply Organization context rules if they are accessing /dashboard
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      // If accessing the dashboard without an active organization context, 
      // redirect them to an org selection/creation page
      if (!orgId && !req.nextUrl.pathname.startsWith('/dashboard/select-business')) {
        return NextResponse.redirect(new URL('/dashboard/select-business', req.url));
      }

      if (orgRole !== 'org:admin') {
        const restrictedPrefixes = [
          '/dashboard/financials', 
          '/dashboard/analytics', 
          '/dashboard/settings', 
          '/dashboard/archive', 
          '/dashboard/clients'
        ];
        if (restrictedPrefixes.some(prefix => req.nextUrl.pathname.startsWith(prefix))) {
          return NextResponse.redirect(new URL('/dashboard/pipeline', req.url));
        }
      }
    }
  }
})

export const config = {
  matcher: [
    // Include root route for homepage auth checks
    '/',
    // Only run middleware on dashboard, admin, and API routes to save Vercel Fluid Compute
    '/dashboard(.*)',
    '/admin(.*)',
    '/api(.*)',
    '/claim-trial(.*)',
  ],
}
