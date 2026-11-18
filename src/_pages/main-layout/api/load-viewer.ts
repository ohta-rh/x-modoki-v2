import 'server-only';
import { getSession } from '@/shared/auth/index.server';

export type Viewer = { name: string; username: string; image: string | null };

/**
 * The signed-in user for the shell's account menu, or null. Requiring a session is the job of
 * proxy.ts and of each page's data access: /{username} needs no login (routing.md 1).
 */
export async function loadViewer(): Promise<Viewer | null> {
  const session = await getSession();
  return session && { name: session.name, username: session.username, image: session.image };
}
