import 'server-only';
import { and, count, eq, isNull } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, notifications } from '@/shared/db';

/** The viewer's unread notifications (#26): the badge on 通知. 0 when signed out. */
export async function countUnread(): Promise<number> {
  const viewer = await getSession();
  if (!viewer) return 0;
  const [row] = await getDb()
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, viewer.id), isNull(notifications.readAt)));
  return row.n;
}
