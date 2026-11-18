import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * A coarse gate: no session cookie on a page that needs one → the login screen, remembering where
 * the visitor was going. Whether the session is valid is checked in the api segments (ADR-0010).
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const login = new URL('/i/flow/login', request.url);
  login.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

// The pages that need a signed-in user (docs/architecture/routing.md 1).
export const config = {
  matcher: [
    '/home',
    '/explore',
    '/search',
    '/notifications/:path*',
    '/i/bookmarks',
    '/compose/:path*',
    '/settings/:path*',
    '/:username/likes',
  ],
};
