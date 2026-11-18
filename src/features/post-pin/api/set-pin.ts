import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, posts, user } from '@/shared/db';

export type SetPinResult =
  { ok: true } | { ok: false; error: 'UNAUTHORIZED' | 'NOT_FOUND' | 'FORBIDDEN' };

/**
 * Pins (or unpins) one of the viewer's own posts to their profile (#23). There is one pin per
 * user — `users.pinned_post_id` — so pinning another post replaces it.
 */
export async function setPin(postId: bigint, pinned: boolean): Promise<SetPinResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const db = getDb();
  const [post] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt), isNull(posts.repostOfId)));
  if (!post) return { ok: false, error: 'NOT_FOUND' };
  if (post.authorId !== viewer.id) return { ok: false, error: 'FORBIDDEN' };
  await db
    .update(user)
    .set({ pinnedPostId: pinned ? postId : null })
    // Unpinning only clears the pin when it is this post.
    .where(
      pinned ? eq(user.id, viewer.id) : and(eq(user.id, viewer.id), eq(user.pinnedPostId, postId)),
    );
  return { ok: true };
}
