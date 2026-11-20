import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

// The pages that need a signed-in user (docs/architecture/routing.md 1), the same as the first
// entries of `config.matcher`.
const NEEDS_LOGIN =
  /^\/(?:home|explore|search|i\/bookmarks|(?:notifications|compose|settings)(?:\/.*)?|[^/]+\/likes)$/;

/**
 * A coarse gate: no session cookie on a page that needs one → the login screen, remembering where
 * the visitor was going. Whether the session is valid is checked in the api segments (ADR-0010).
 *
 * A path Next.js cannot decode (`/%ZZ`) would end in a bare 500 when it reaches a dynamic segment,
 * so it gets the 404 screen first (#73). A path that decodes goes on as before.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  try {
    decodeURIComponent(pathname);
  } catch {
    return NextResponse.rewrite(new URL('/404', request.url));
  }
  if (!NEEDS_LOGIN.test(pathname) || getSessionCookie(request)) return NextResponse.next();
  const login = new URL('/i/flow/login', request.url);
  login.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

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
    // Any path with a percent sign: the malformed ones are answered above (#73).
    '/:path(.*%.*)',
  ],
};
