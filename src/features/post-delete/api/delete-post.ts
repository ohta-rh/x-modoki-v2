import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { forgetPost } from '@/entities/notification/index.server';
import { getSession } from '@/shared/auth/index.server';
import { getDb, posts, user } from '@/shared/db';

export type DeletePostResult =
  { ok: true } | { ok: false; error: 'UNAUTHORIZED' | 'NOT_FOUND' | 'FORBIDDEN' };

/**
 * Deletes the viewer's own post by setting deleted_at (the row stays for its replies, data-model.md).
 * A deleted reply takes one off its parent's reply count, never below zero (#20, T-01).
 */
export async function deletePost(postId: bigint): Promise<DeletePostResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const db = getDb();
  const [post] = await db
    .select({ authorId: posts.authorId, replyToId: posts.replyToId })
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)));
  if (!post) return { ok: false, error: 'NOT_FOUND' };
  if (post.authorId !== viewer.id) return { ok: false, error: 'FORBIDDEN' };
  // The update itself re-checks deleted_at, so of concurrent deletes only one changes the counts.
  return db.transaction(async (tx): Promise<DeletePostResult> => {
    const deleted = await tx
      .update(posts)
      .set({ deletedAt: new Date() })
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .returning({ id: posts.id });
    if (deleted.length === 0) return { ok: false, error: 'NOT_FOUND' };
    if (post.replyToId !== null) {
      await tx
        .update(posts)
        .set({ replyCount: sql`greatest(${posts.replyCount} - 1, 0)` })
        .where(eq(posts.id, post.replyToId));
    }
    await tx
      .update(user)
      .set({ postsCount: sql`greatest(${user.postsCount} - 1, 0)` })
      .where(eq(user.id, viewer.id));
    await forgetPost(tx, postId);
    return { ok: true };
  });
}
