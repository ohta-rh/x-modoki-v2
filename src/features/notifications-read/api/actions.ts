'use server';

import { parseId } from '@/shared/lib/id';
import { markNotificationsRead } from './mark-read';

export type MarkNotificationsReadResult =
  { ok: true } | { ok: false; error: 'UNAUTHORIZED' | 'VALIDATION' };

/** Called by the notifications screen once it shows notifications (#26). */
export async function markNotificationsReadAction(
  upTo: unknown,
): Promise<MarkNotificationsReadResult> {
  const id = typeof upTo === 'string' ? parseId(upTo) : null;
  if (id === null) return { ok: false, error: 'VALIDATION' };
  return markNotificationsRead(id);
}
