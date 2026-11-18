import 'server-only';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getSession } from '@/shared/auth/index.server';
import { LOGIN_PATH } from '@/shared/config';

/** /compose/post (#28): the viewer's username, for the toast's link to the new post. */
export async function loadCompose(): Promise<{ username: string }> {
  await connection();
  const viewer = await getSession();
  if (!viewer) redirect(LOGIN_PATH);
  return { username: viewer.username };
}
