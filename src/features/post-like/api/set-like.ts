import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, likes, posts } from '@/shared/db';

export type SetLikeResult =
  { ok: true; liked: boolean; count: number } | { ok: false; error: 'UNAUTHORIZED' | 'NOT_FOUND' };

/**
 * Likes or unlikes a post for the viewer (data-model.md 4, #21). The row and the count change in
 * one transaction, and the count moves only when a row was really added or removed, so repeated or
 * concurrent presses count once and the count never goes below zero.
 */
export async function setLike(postId: bigint, liked: boolean): Promise<SetLikeResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  return getDb().transaction(async (tx): Promise<SetLikeResult> => {
    // Lock the row for the count update up front: presses on one post queue instead of
    // deadlocking (a share lock then an update deadlocks), and a delete waits until this commits.
    const [post] = await tx
      .select({ count: posts.likeCount })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .for('no key update');
    if (!post) return { ok: false, error: 'NOT_FOUND' };
    const changed = liked
      ? await tx
          .insert(likes)
          .values({ userId: viewer.id, postId })
          .onConflictDoNothing()
          .returning({ postId: likes.postId })
      : await tx
          .delete(likes)
          .where(and(eq(likes.userId, viewer.id), eq(likes.postId, postId)))
          .returning({ postId: likes.postId });
    // A conditional, not an if: V8 counts both arms of an if after await wrongly under concurrency.
    const count =
      changed.length === 0
        ? post.count
        : (
            await tx
              .update(posts)
              .set({
                likeCount: liked
                  ? sql`${posts.likeCount} + 1`
                  : sql`greatest(${posts.likeCount} - 1, 0)`,
              })
              .where(eq(posts.id, postId))
              .returning({ count: posts.likeCount })
          )[0].count;
    return { ok: true, liked, count };
  });
}
