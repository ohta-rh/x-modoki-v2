import 'server-only';
import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { clientIp, hitRateLimit } from '@/shared/api/index.server';
import { getAuth } from '@/shared/auth/index.server';
import { env } from '@/shared/config/index.server';
import type { SignInInput, SignUpInput } from '../model/schema';

export type AuthResult =
  | { ok: true }
  | { ok: false; error: 'RATE_LIMITED' | 'INVALID_CREDENTIALS' }
  | {
      ok: false;
      error: 'VALIDATION';
      fieldErrors: Partial<Record<'username' | 'email', string[]>>;
    };

const RATE_LIMITED = { ok: false, error: 'RATE_LIMITED' } as const;

/** Sign-up and sign-in share one per-IP budget per minute (NFR-SEC-05, ADR-0036). */
async function allowed(): Promise<boolean> {
  const ip = clientIp(await headers());
  return hitRateLimit(`auth:${ip}`, { limit: env.AUTH_RATE_LIMIT_PER_MINUTE, windowMs: 60_000 });
}

const code = (error: unknown) => (error instanceof APIError ? error.body?.code : undefined);

/** Creates the user and signs them in (the session cookie is set through nextCookies). */
export async function signUp(input: SignUpInput): Promise<AuthResult> {
  if (!(await allowed())) return RATE_LIMITED;
  try {
    await getAuth().api.signUpEmail({ body: input, headers: await headers() });
    return { ok: true };
  } catch (error) {
    if (code(error) === 'USERNAME_IS_ALREADY_TAKEN') {
      return {
        ok: false,
        error: 'VALIDATION',
        fieldErrors: { username: ['このユーザー名は使われています'] },
      };
    }
    if (String(code(error)).startsWith('USER_ALREADY_EXISTS')) {
      return {
        ok: false,
        error: 'VALIDATION',
        fieldErrors: { email: ['このメールアドレスは使われています'] },
      };
    }
    throw error;
  }
}

/** Signs in with a username or an email address; never says which part was wrong (FR-AUTH-04). */
export async function signIn(input: SignInInput): Promise<AuthResult> {
  if (!(await allowed())) return RATE_LIMITED;
  const api = getAuth().api;
  const requestHeaders = await headers();
  try {
    if (input.kind === 'username') {
      await api.signInUsername({
        body: { username: input.username, password: input.password },
        headers: requestHeaders,
      });
    } else {
      await api.signInEmail({
        body: { email: input.email, password: input.password },
        headers: requestHeaders,
      });
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof APIError) return { ok: false, error: 'INVALID_CREDENTIALS' };
    throw error;
  }
}

/** Ends the current session and deletes its row. */
export async function signOut(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
}
