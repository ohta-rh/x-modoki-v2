import 'server-only';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getSession } from '@/shared/auth/index.server';
import { LOGIN_PATH } from '@/shared/config';
import { getDb, user } from '@/shared/db';

export type AccountData = { username: string; email: string; createdAt: string };

/** /settings/account (#29): the viewer's own username, email address and sign-up date. */
export async function loadAccount(): Promise<AccountData> {
  await connection();
  const viewer = await getSession();
  if (!viewer) redirect(LOGIN_PATH);
  // The viewer exists, so their row does.
  const [row] = await getDb()
    .select({ email: user.email, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, viewer.id));
  return { username: viewer.username, email: row.email, createdAt: row.createdAt.toISOString() };
}
