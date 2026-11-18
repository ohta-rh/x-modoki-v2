import 'server-only';
import { requireSession } from '@/shared/auth/index.server';

export type Viewer = { name: string; username: string; image: string | null };

/** The signed-in user for the shell's account menu; signed-out visitors go to the login screen. */
export async function loadViewer(): Promise<Viewer> {
  const { name, username, image } = await requireSession();
  return { name, username, image };
}
