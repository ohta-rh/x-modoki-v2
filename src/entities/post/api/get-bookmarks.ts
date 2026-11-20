import 'server-only';
import { and, desc, eq, isNull, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { bookmarks, getDb, posts, user } from '@/shared/db';
import type { PostPage } from '../model/types';
import { postColumns, toPosts } from './post-rows';
import { afterTimeCursor, microsOf } from './time-cursor';

const PAGE_SIZE = 20;

export type BookmarksResult =
  { ok: true; page: PostPage } | { ok: false; error: 'UNAUTHORIZED' | 'BAD_CURSOR' };

const micros = microsOf(bookmarks.createdAt);

/**
 * One page of the viewer's bookmarks (#21): newest bookmark first, 20 at a time, undeleted posts
 * only. The cursor is `<microseconds>_<post id>` of the last bookmark on the page.
 */
export async function getBookmarks(cursor: string | null): Promise<BookmarksResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const where: SQL[] = [eq(bookmarks.userId, viewer.id), isNull(posts.deletedAt)];
  if (cursor !== null) {
    const after = afterTimeCursor(cursor, bookmarks.createdAt, bookmarks.postId);
    if (!after) return { ok: false, error: 'BAD_CURSOR' };
    where.push(after);
  }
  const rows = await getDb()
    .select({ ...postColumns(viewer.id), micros })
    .from(bookmarks)
    .innerJoin(posts, eq(posts.id, bookmarks.postId))
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(and(...where))
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.postId))
    .limit(PAGE_SIZE + 1);
  const page = rows.slice(0, PAGE_SIZE);
  const items = await toPosts(page, viewer.id);
  const last = page[PAGE_SIZE - 1];
  const nextCursor = rows.length > PAGE_SIZE ? `${last.micros}_${last.post.id}` : null;
  return { ok: true, page: { items, nextCursor } };
}
