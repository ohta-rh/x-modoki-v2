import 'server-only';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { getDb, media } from '@/shared/db';
import { removeObject } from '@/shared/storage';

const DAY = 24 * 3600 * 1000;
/** Per call: a Worker's run is short (ADR-0017); the next day's run takes the rest. */
const BATCH = 500;

/**
 * Removes the uploads no post or profile took within a day (#25, threat model T-15): each
 * `pending` row older than 24 hours, and its object if one was put. Called once a day by the
 * cron Route Handler; `ready` rows belong to a post or a profile and are never touched.
 */
export async function cleanupMedia(now = new Date()): Promise<{ removed: number }> {
  const db = getDb();
  const stale = await db
    .select({ id: media.id, key: media.key })
    .from(media)
    .where(and(eq(media.status, 'pending'), lt(media.createdAt, new Date(now.getTime() - DAY))))
    .limit(BATCH);
  await Promise.all(stale.map((row) => removeObject(row.key)));
  const removed = await db
    .delete(media)
    .where(
      and(
        inArray(
          media.id,
          stale.map((row) => row.id),
        ),
        eq(media.status, 'pending'),
      ),
    )
    .returning({ id: media.id });
  return { removed: removed.length };
}
