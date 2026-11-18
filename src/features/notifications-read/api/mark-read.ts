import 'server-only';
import { and, eq, isNull, lte } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, notifications } from '@/shared/db';

export type MarkReadResult = { ok: true } | { ok: false; error: 'UNAUTHORIZED' };

/**
 * Marks the viewer's notifications read, up to the newest one on the screen (#26): one that came
 * in after the screen was drawn stays unread. Only the viewer's own.
 */
export async function markNotificationsRead(upTo: bigint): Promise<MarkReadResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, viewer.id),
        lte(notifications.id, upTo),
        isNull(notifications.readAt),
      ),
    );
  return { ok: true };
}
