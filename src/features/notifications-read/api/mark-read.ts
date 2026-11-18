import 'server-only';
import { and, count, eq, inArray, isNull, lte, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, notifications } from '@/shared/db';

export type NotificationsTab = 'all' | 'mentions';
export type MarkReadResult = { ok: true; unread: number } | { ok: false; error: 'UNAUTHORIZED' };

/** What the 「メンション」 tab shows (entities/notification getNotifications). */
const MENTION_TYPES = ['mention', 'reply'] as const;

/**
 * Marks read what a tab shows (#26): the viewer's notifications up to the newest one on the screen,
 * of the tab's kinds only — the 「メンション」 tab leaves likes and follows unread (review 1). One that
 * came in after the screen was drawn stays unread. Returns what is still unread, for the badge.
 */
export async function markNotificationsRead(
  upTo: bigint,
  tab: NotificationsTab,
): Promise<MarkReadResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const mine = eq(notifications.recipientId, viewer.id);
  const shown: SQL[] = [mine, lte(notifications.id, upTo), isNull(notifications.readAt)];
  if (tab === 'mentions') shown.push(inArray(notifications.type, [...MENTION_TYPES]));
  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(...shown));
  const [left] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(mine, isNull(notifications.readAt)));
  return { ok: true, unread: left.n };
}
