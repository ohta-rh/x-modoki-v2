import type { Route } from 'next';

const FALLBACK = '/home' as Route;

/**
 * The path to return to after signing in, or /home (NFR-SEC-10). Only a same-site absolute path:
 * it starts with one "/" and never with "//" or "/\" (both read as another host), and holds no
 * control characters.
 */
export function safeNextPath(next: string | null | undefined): Route {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return FALLBACK;
  }
  return /[\u0000-\u001f\u007f]/.test(next) ? FALLBACK : (next as Route);
}
