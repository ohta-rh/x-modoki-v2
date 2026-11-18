import 'server-only';
import { and, desc, eq, inArray, isNull, lt, or, sql, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { follows, getDb, posts, user } from '@/shared/db';
import { toIdString } from '@/shared/lib/id';
import { mediaUrl } from '@/shared/lib/media-url';
import type { Post, PostPage, TimelineKind } from '../model/types';

const PAGE_SIZE = 20;

export type TimelineResult = { ok: true; page: PostPage } | { ok: false; error: 'UNAUTHORIZED' };

/**
 * One page of the home timeline (docs/architecture/data-model.md 4, ADR-0015): top-level, undeleted
 * posts, newest first, 20 at a time; the 21st row only says whether there is more.
 */
export async function getTimeline(
  kind: TimelineKind,
  cursor: bigint | null,
): Promise<TimelineResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const db = getDb();
  const where: SQL[] = [isNull(posts.deletedAt), isNull(posts.replyToId)];
  if (kind === 'following') {
    const followees = db
      .select({ id: follows.followeeId })
      .from(follows)
      .where(eq(follows.followerId, viewer.id));
    where.push(or(eq(posts.authorId, viewer.id), inArray(posts.authorId, followees))!);
  }
  if (cursor !== null) where.push(lt(posts.id, cursor));
  const rows = await db
    .select({
      post: posts,
      author: { username: user.username, name: user.name, image: user.image },
      liked: sql<boolean>`exists (select 1 from likes l where l.post_id = ${posts.id} and l.user_id = ${viewer.id})`,
      bookmarked: sql<boolean>`exists (select 1 from bookmarks b where b.post_id = ${posts.id} and b.user_id = ${viewer.id})`,
      reposted: sql<boolean>`exists (select 1 from posts r where r.repost_of_id = ${posts.id} and r.author_id = ${viewer.id})`,
    })
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(and(...where))
    .orderBy(desc(posts.id))
    .limit(PAGE_SIZE + 1);

  const items: Post[] = rows
    .slice(0, PAGE_SIZE)
    .map(({ post, author, liked, bookmarked, reposted }) => ({
      id: toIdString(post.id),
      author: { username: author.username!, name: author.name, avatarUrl: mediaUrl(author.image) },
      text: post.text,
      createdAt: post.createdAt.toISOString(),
      media: [],
      counts: {
        replies: post.replyCount,
        reposts: post.repostCount,
        likes: post.likeCount,
        bookmarks: post.bookmarkCount,
        views: post.viewCount,
      },
      viewer: { liked, reposted, bookmarked },
      repostedBy: null,
      replyTo: null,
      quoted: null,
    }));
  const nextCursor = rows.length > PAGE_SIZE ? items[PAGE_SIZE - 1].id : null;
  return { ok: true, page: { items, nextCursor } };
}
