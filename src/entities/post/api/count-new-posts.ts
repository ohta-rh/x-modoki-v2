import 'server-only';
import { and, count, eq, gt, inArray, isNull } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { follows, getDb, posts } from '@/shared/db';

export type CountNewPostsResult =
  { ok: true; count: number } | { ok: false; error: 'UNAUTHORIZED' };

/**
 * How many posts the フォロー中 timeline has above `since`, its newest shown (#28): top-level,
 * undeleted posts by the people the viewer follows. The viewer's own are not counted — posting
 * reloads the timeline already.
 */
export async function countNewPosts(since: bigint): Promise<CountNewPostsResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const db = getDb();
  const followees = db
    .select({ id: follows.followeeId })
    .from(follows)
    .where(eq(follows.followerId, viewer.id));
  const [row] = await db
    .select({ count: count() })
    .from(posts)
    .where(
      and(
        gt(posts.id, since),
        isNull(posts.deletedAt),
        isNull(posts.replyToId),
        inArray(posts.authorId, followees),
      ),
    );
  return { ok: true, count: row.count };
}
