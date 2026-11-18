import 'server-only';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { env } from '@/shared/config';
import { getDb, media } from '@/shared/db';
import { removeObject } from '@/shared/storage';

const DAY = 24 * 3600 * 1000;
/** Per call: a Worker's run is short (ADR-0017); the next day's run takes the rest. */
const BATCH = 500;

/** Compares without stopping at the first difference, so the time taken does not leak the secret. */
function sameSecret(given: string, expected: string): boolean {
  let difference = given.length ^ expected.length;
  for (let i = 0; i < expected.length; i += 1) {
    difference |= (given.charCodeAt(i) || 0) ^ expected.charCodeAt(i);
  }
  return difference === 0;
}

export type CleanupMediaResult =
  { ok: true; removed: number } | { ok: false; error: 'UNAUTHORIZED' };

/**
 * Removes the uploads no post or profile took within a day (#25): each `pending` row older than
 * 24 hours, and its object if one was put. Only for a caller holding `Authorization: Bearer
 * <CRON_SECRET>` (threat model T-15) — checked here, in the `api` segment, like every other
 * mutation (application-structure.md 6). `ready` rows belong to a post or a profile and are
 * never touched.
 */
export async function cleanupMedia({
  authorization,
  now = new Date(),
}: {
  authorization: string | null;
  now?: Date;
}): Promise<CleanupMediaResult> {
  if (!sameSecret(authorization ?? '', `Bearer ${env.CRON_SECRET}`)) {
    return { ok: false, error: 'UNAUTHORIZED' };
  }
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
  return { ok: true, removed: removed.length };
}
