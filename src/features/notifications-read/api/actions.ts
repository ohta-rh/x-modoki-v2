'use server';

import { parseId } from '@/shared/lib/id';
import { markNotificationsRead } from './mark-read';

export type MarkNotificationsReadResult =
  | { ok: true; unread: number }
  // OFFLINE: the request never reached the server; only the client gives it (#82 review 2).
  | { ok: false; error: 'UNAUTHORIZED' | 'VALIDATION' | 'OFFLINE' };

/** Called by the notifications screen once it shows notifications (#26). */
export async function markNotificationsReadAction(
  upTo: unknown,
  tab: unknown,
): Promise<MarkNotificationsReadResult> {
  const id = typeof upTo === 'string' ? parseId(upTo) : null;
  if (id === null || (tab !== 'all' && tab !== 'mentions')) {
    return { ok: false, error: 'VALIDATION' };
  }
  return markNotificationsRead(id, tab);
}
