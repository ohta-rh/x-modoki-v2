import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from '@/shared/auth/index.server';

/** `/` is the entry for signed-out visitors; signed-in users go straight to /home (routing.md 1). */
export async function redirectIfSignedIn(): Promise<void> {
  if (await getSession()) redirect('/home');
}
