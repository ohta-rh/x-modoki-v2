import 'server-only';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getSession } from '@/shared/auth/index.server';
import { type Accent, LOGIN_PATH, type Theme } from '@/shared/config';
import { getDb, user } from '@/shared/db';

/** /settings/display (#29): the viewer's saved theme and accent colour. */
export async function loadDisplay(): Promise<{ theme: Theme; accent: Accent }> {
  await connection();
  const viewer = await getSession();
  if (!viewer) redirect(LOGIN_PATH);
  // The viewer exists, so their row does.
  const [row] = await getDb()
    .select({ theme: user.theme, accent: user.accent })
    .from(user)
    .where(eq(user.id, viewer.id));
  return row as { theme: Theme; accent: Accent };
}
