import { type NextRequest, NextResponse } from 'next/server';

/** A coarse gate only; authorization happens in the api segments (ADR-0010). Redirects arrive in #18. */
export function proxy(request: NextRequest) {
  void request;
  return NextResponse.next();
}

export const config = { matcher: ['/home'] };
