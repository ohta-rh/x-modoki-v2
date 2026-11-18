import 'server-only';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { bookmarks, getDb, posts } from '@/shared/db';

export type SetBookmarkResult =
  | { ok: true; bookmarked: boolean; count: number }
  | { ok: false; error: 'UNAUTHORIZED' | 'NOT_FOUND' };

/**
 * Bookmarks or un-bookmarks a post for the viewer (#21): the row and the count in one transaction,
 * the count moving only when a row was really added or removed (never below zero).
 */
export async function setBookmark(postId: bigint, bookmarked: boolean): Promise<SetBookmarkResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  return getDb().transaction(async (tx): Promise<SetBookmarkResult> => {
    // Lock the row for the count update up front: presses on one post queue instead of
    // deadlocking (a share lock then an update deadlocks), and a delete waits until this commits.
    const [post] = await tx
      .select({ count: posts.bookmarkCount })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .for('no key update');
    if (!post) return { ok: false, error: 'NOT_FOUND' };
    const changed = bookmarked
      ? await tx
          .insert(bookmarks)
          .values({ userId: viewer.id, postId })
          .onConflictDoNothing()
          .returning({ postId: bookmarks.postId })
      : await tx
          .delete(bookmarks)
          .where(and(eq(bookmarks.userId, viewer.id), eq(bookmarks.postId, postId)))
          .returning({ postId: bookmarks.postId });
    // A conditional, not an if: V8 counts both arms of an if after await wrongly under concurrency.
    const count =
      changed.length === 0
        ? post.count
        : (
            await tx
              .update(posts)
              .set({
                bookmarkCount: bookmarked
                  ? sql`${posts.bookmarkCount} + 1`
                  : sql`greatest(${posts.bookmarkCount} - 1, 0)`,
              })
              .where(eq(posts.id, postId))
              .returning({ count: posts.bookmarkCount })
          )[0].count;
    return { ok: true, bookmarked, count };
  });
}

/** Removes all of the viewer's bookmarks, taking one off each post's count (#21, 全て削除). */
export async function clearBookmarks(): Promise<
  { ok: true } | { ok: false; error: 'UNAUTHORIZED' }
> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  await getDb().transaction(async (tx) => {
    const removed = await tx
      .delete(bookmarks)
      .where(eq(bookmarks.userId, viewer.id))
      .returning({ postId: bookmarks.postId });
    await tx
      .update(posts)
      .set({ bookmarkCount: sql`greatest(${posts.bookmarkCount} - 1, 0)` })
      .where(
        inArray(
          posts.id,
          removed.map((row) => row.postId),
        ),
      );
  });
  return { ok: true };
}
