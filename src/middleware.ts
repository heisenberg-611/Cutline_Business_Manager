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
    
    // If accessing the dashboard without an active organization context, 
    // redirect them to an org selection/creation page
    if (!orgId && !req.nextUrl.pathname.startsWith('/dashboard/select-business')) {
      return NextResponse.redirect(new URL('/dashboard/select-business', req.url));
    }

    // 3. Enforce RBAC: Members can only access the Pipeline
    if (orgId && orgRole === 'org:member') {
      const allowedMemberPaths = ['/dashboard/pipeline', '/dashboard/select-business']
      // We allow API calls through the middleware (they should have server action/api route protection if modifying data)
      const isAllowed = allowedMemberPaths.some(path => req.nextUrl.pathname.startsWith(path)) || req.nextUrl.pathname.startsWith('/api')
      
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/dashboard/pipeline', req.url))
      }
    }
  }
})

export const config = {
  matcher: [
    // Only run middleware on dashboard and API routes to save Vercel Fluid Compute
    '/dashboard(.*)',
    '/api(.*)',
  ],
}
