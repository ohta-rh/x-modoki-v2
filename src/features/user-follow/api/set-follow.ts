import 'server-only';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { hitRateLimit } from '@/shared/api/index.server';
import { getSession } from '@/shared/auth/index.server';
import { follows, getDb, user } from '@/shared/db';

export type SetFollowResult =
  | { ok: true; following: boolean; followersCount: number }
  | { ok: false; error: 'UNAUTHORIZED' | 'NOT_FOUND' | 'FORBIDDEN' | 'RATE_LIMITED' };

/**
 * Follows or unfollows a user for the viewer (#24). The `follows` row and both users' counts
 * change in one transaction, and only when a row was really added or removed. 30 presses per
 * minute (as on X); a user cannot follow themselves.
 */
export async function setFollow(username: string, following: boolean): Promise<SetFollowResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  if (!(await hitRateLimit(`follow:${viewer.id}`, { limit: 30, windowMs: 60_000 }))) {
    return { ok: false, error: 'RATE_LIMITED' };
  }
  const db = getDb();
  const [target] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.username})`, username.toLowerCase()));
  if (!target) return { ok: false, error: 'NOT_FOUND' };
  if (target.id === viewer.id) return { ok: false, error: 'FORBIDDEN' };
  return db.transaction(async (tx): Promise<SetFollowResult> => {
    // Both rows are locked in one order (by id), so two people following each other at once
    // queue instead of deadlocking.
    await tx
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.id, [viewer.id, target.id]))
      .orderBy(asc(user.id))
      .for('no key update');
    const changed = following
      ? await tx
          .insert(follows)
          .values({ followerId: viewer.id, followeeId: target.id })
          .onConflictDoNothing()
          .returning({ id: follows.followeeId })
      : await tx
          .delete(follows)
          .where(and(eq(follows.followerId, viewer.id), eq(follows.followeeId, target.id)))
          .returning({ id: follows.followeeId });
    const step = following ? 1 : -1;
    // Conditionals, not an if: V8 counts both arms of an if after await wrongly under concurrency.
    const moved = changed.length === 0 ? 0 : step;
    await tx
      .update(user)
      .set({ followingCount: sql`greatest(${user.followingCount} + ${moved}, 0)` })
      .where(eq(user.id, viewer.id));
    const [counted] = await tx
      .update(user)
      .set({ followersCount: sql`greatest(${user.followersCount} + ${moved}, 0)` })
      .where(eq(user.id, target.id))
      .returning({ followersCount: user.followersCount });
    return { ok: true, following, followersCount: counted.followersCount };
  });
}
