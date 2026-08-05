import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { verifyAdminSessionCookie, hasAdminSecret } from '@/lib/admin-session'

// Protect everything inside /dashboard
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Webhooks are verified via Svix signatures, not Clerk sessions.
  // Bypassing middleware here prevents Next.js/Clerk header parsing bugs with svix-cli.
  if (req.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  // Admin / HQ Protection
  let res = NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/hq')) {
    // Fails closed. This previously fell back to a literal committed to a
    // public repository, so a missing env var silently published the gate key.
    if (!hasAdminSecret()) {
      console.error('[middleware] ADMIN_SECRET_KEY is missing — refusing all /hq access');
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Verified, not merely present: the old check accepted any cookie value at
    // all and then reissued it with a fresh expiry.
    const session = await verifyAdminSessionCookie(req.cookies.get('admin_session')?.value);

    if (session) {
      // Deliberately does NOT extend the session. Re-signing on every request
      // would turn the inactivity timeout into an unbounded one; the cookie
      // carries its own expiry and a fresh one is issued at sign-in.
      res.cookies.set('hq_gate', '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/hq',
        maxAge: 60 * 60,
      });
    } else {
      const gatePassed = req.cookies.get('hq_gate')?.value === '1';
      const secretKey = req.nextUrl.searchParams.get('key');

      if (secretKey && secretKey === process.env.ADMIN_SECRET_KEY) {
        // Exchange the key for a short-lived cookie and strip it from the URL,
        // so the secret stops travelling in history, referrers and access logs.
        const clean = new URL(req.url);
        clean.searchParams.delete('key');
        const redirect = NextResponse.redirect(clean);
        redirect.cookies.set('hq_gate', '1', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/hq',
          maxAge: 60 * 60,
        });
        return redirect;
      }

      if (!gatePassed) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
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

  return res;
})

export const config = {
  matcher: [
    // Include root route for homepage auth checks
    '/',
    // Only run middleware on dashboard, admin, and API routes to save Vercel Fluid Compute
    '/dashboard(.*)',
    '/hq(.*)',
    '/api(.*)',
    '/claim-trial(.*)',
  ],
}
