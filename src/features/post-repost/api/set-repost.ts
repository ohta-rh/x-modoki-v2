import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, posts } from '@/shared/db';
import { newId } from '@/shared/lib/id';

export type SetRepostResult =
  | { ok: true; reposted: boolean; count: number }
  | { ok: false; error: 'UNAUTHORIZED' | 'NOT_FOUND' };

/**
 * Reposts or un-reposts a post for the viewer (#22, ADR-0015). A repost is one `posts` row with
 * an empty text and `repost_of_id`; pressing repost on a repost targets its original (a reply is
 * its own original). The row and the original's count change in one transaction, and only when a
 * row was really added or removed.
 */
export async function setRepost(postId: bigint, reposted: boolean): Promise<SetRepostResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const db = getDb();
  const [pressed] = await db
    .select({ id: posts.id, repostOfId: posts.repostOfId })
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)));
  if (!pressed) return { ok: false, error: 'NOT_FOUND' };
  const target = pressed.repostOfId ?? pressed.id;
  return db.transaction(async (tx): Promise<SetRepostResult> => {
    // Locked for the count update up front, so concurrent reposts queue instead of deadlocking.
    const [original] = await tx
      .select({ count: posts.repostCount })
      .from(posts)
      .where(and(eq(posts.id, target), isNull(posts.deletedAt)))
      .for('no key update');
    if (!original) return { ok: false, error: 'NOT_FOUND' };
    const changed = reposted
      ? await tx
          .insert(posts)
          .values({ id: newId(), authorId: viewer.id, text: '', repostOfId: target })
          .onConflictDoNothing()
          .returning({ id: posts.id })
      : await tx
          .delete(posts)
          .where(and(eq(posts.authorId, viewer.id), eq(posts.repostOfId, target)))
          .returning({ id: posts.id });
    // A conditional, not an if: V8 counts both arms of an if after await wrongly under concurrency.
    const count =
      changed.length === 0
        ? original.count
        : (
            await tx
              .update(posts)
              .set({
                repostCount: reposted
                  ? sql`${posts.repostCount} + 1`
                  : sql`greatest(${posts.repostCount} - 1, 0)`,
              })
              .where(eq(posts.id, target))
              .returning({ count: posts.repostCount })
          )[0].count;
    return { ok: true, reposted, count };
  });
}
