import 'server-only';
import { and, desc, eq, exists, isNull, lt, ne, sql, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, likes, postMedia, posts, user } from '@/shared/db';
import { parseId } from '@/shared/lib/id';
import type { Post, PostPage, UserPostsTab } from '../model/types';
import { postColumns, toPosts } from './post-rows';
import { afterTimeCursor, microsOf } from './time-cursor';

const PAGE_SIZE = 20;

export type UserPostsResult =
  { ok: true; page: PostPage } | { ok: false; error: 'NOT_FOUND' | 'FORBIDDEN' | 'BAD_CURSOR' };

/**
 * One page of a profile tab (#23, ui-ux.md 8), newest first, 20 at a time:
 * ポスト — the user's posts and reposts but not replies, the pinned post first on page one;
 * 返信 — everything they posted; メディア — posts with images; いいね — what they liked, newest
 * like first, readable by the user alone.
 */
export async function getUserPosts(
  username: string,
  tab: UserPostsTab,
  cursor: string | null,
): Promise<UserPostsResult> {
  const viewerId = (await getSession())?.id ?? null;
  const db = getDb();
  const [owner] = await db
    .select({ id: user.id, pinnedPostId: user.pinnedPostId })
    .from(user)
    .where(eq(sql`lower(${user.username})`, username.toLowerCase()));
  if (!owner) return { ok: false, error: 'NOT_FOUND' };
  if (tab === 'likes') {
    return viewerId === owner.id ? likedPosts(owner.id, cursor) : { ok: false, error: 'FORBIDDEN' };
  }

  const where: SQL[] = [eq(posts.authorId, owner.id), isNull(posts.deletedAt)];
  if (tab === 'posts') where.push(isNull(posts.replyToId));
  if (tab === 'media') {
    where.push(exists(db.select().from(postMedia).where(eq(postMedia.postId, posts.id))));
  }
  const pinnedId = tab === 'posts' ? owner.pinnedPostId : null;
  // The pinned post is shown once, on top, so it is left out of the list itself.
  if (pinnedId !== null) where.push(ne(posts.id, pinnedId));
  if (cursor !== null) {
    const before = parseId(cursor);
    if (before === null) return { ok: false, error: 'BAD_CURSOR' };
    where.push(lt(posts.id, before));
  }
  const rows = await db
    .select(postColumns(viewerId))
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(and(...where))
    .orderBy(desc(posts.id))
    .limit(PAGE_SIZE + 1);
  const items = await toPosts(rows.slice(0, PAGE_SIZE), viewerId);
  const nextCursor = rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].post.id.toString() : null;
  const pinned: Post[] =
    pinnedId !== null && cursor === null
      ? (
          await toPosts(
            await db
              .select(postColumns(viewerId))
              .from(posts)
              .innerJoin(user, eq(user.id, posts.authorId))
              .where(and(eq(posts.id, pinnedId), isNull(posts.deletedAt))),
            viewerId,
          )
        ).map((post) => ({ ...post, pinned: true }))
      : [];
  return { ok: true, page: { items: [...pinned, ...items], nextCursor } };
}

const likedAt = microsOf(likes.createdAt);

async function likedPosts(ownerId: string, cursor: string | null): Promise<UserPostsResult> {
  const where: SQL[] = [eq(likes.userId, ownerId), isNull(posts.deletedAt)];
  if (cursor !== null) {
    const after = afterTimeCursor(cursor, likes.createdAt, likes.postId);
    if (!after) return { ok: false, error: 'BAD_CURSOR' };
    where.push(after);
  }
  const rows = await getDb()
    .select({ ...postColumns(ownerId), likedAt })
    .from(likes)
    .innerJoin(posts, eq(posts.id, likes.postId))
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(and(...where))
    .orderBy(desc(likes.createdAt), desc(likes.postId))
    .limit(PAGE_SIZE + 1);
  const page = rows.slice(0, PAGE_SIZE);
  const last = page[PAGE_SIZE - 1];
  const nextCursor = rows.length > PAGE_SIZE ? `${last.likedAt}_${last.post.id}` : null;
  return { ok: true, page: { items: await toPosts(page, ownerId), nextCursor } };
}
