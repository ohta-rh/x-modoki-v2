import 'server-only';
import { eq } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import type { Accent, Theme } from '@/shared/config';
import { getDb, user } from '@/shared/db';

export type UpdateDisplayResult = { ok: true } | { ok: false; error: 'UNAUTHORIZED' };

/** Saves the viewer's theme and accent colour (#29). */
export async function updateDisplay(display: {
  theme: Theme;
  accent: Accent;
}): Promise<UpdateDisplayResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  await getDb().update(user).set(display).where(eq(user.id, viewer.id));
  return { ok: true };
}
