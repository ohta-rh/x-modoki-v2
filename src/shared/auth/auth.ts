import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { username } from 'better-auth/plugins';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { env, LOGIN_PATH } from '@/shared/config';
import { getDb, schema } from '@/shared/db';

/** Better Auth for this request (ADR-0007; the settings verified in #10). */
export const getAuth = cache(() =>
  betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    // One rate limit mechanism for the whole app: rate_limits (ADR-0010, NFR-SEC-05).
    rateLimit: { enabled: false },
    plugins: [username({ minUsernameLength: 4, maxUsernameLength: 15 }), nextCookies()],
  }),
);

/** The signed-in user as the app sees it: no email, no internal columns (NFR-SEC-03). */
export type SessionUser = {
  id: string;
  name: string;
  username: string;
  displayUsername: string;
  image: string | null;
};

/** The signed-in user, read once per request, or null. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  await connection(); // #10 3.2: never read the session while prerendering
  const requestHeaders = await headers(); // #10 3.1: before betterAuth() is built
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, username, displayUsername, image } = session.user;
  // Sign-up always sets both through the username plugin (src/features/account-access).
  return { id, name, username: username!, displayUsername: displayUsername!, image: image ?? null };
});

/** For pages that need a user: the signed-in user, or a redirect to the login screen. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  return session;
}
