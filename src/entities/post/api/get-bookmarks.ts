import 'server-only';
import { and, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { bookmarks, getDb, posts, user } from '@/shared/db';
import { parseId } from '@/shared/lib/id';
import type { PostPage } from '../model/types';
import { postColumns, toPosts } from './post-rows';

const PAGE_SIZE = 20;

export type BookmarksResult =
  { ok: true; page: PostPage } | { ok: false; error: 'UNAUTHORIZED' | 'BAD_CURSOR' };

// The bookmark's time in whole microseconds (PostgreSQL's precision) and the post: exact, so a
// page never skips or repeats a bookmark made in the same instant (ADR-0040).
const micros = sql<string>`(extract(epoch from ${bookmarks.createdAt}) * 1000000)::bigint::text`;
const CURSOR = /^(\d+)_(\d+)$/;

/**
 * One page of the viewer's bookmarks (#21): newest bookmark first, 20 at a time, undeleted posts
 * only. The cursor is `<microseconds>_<post id>` of the last bookmark on the page.
 */
export async function getBookmarks(cursor: string | null): Promise<BookmarksResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const where: SQL[] = [eq(bookmarks.userId, viewer.id), isNull(posts.deletedAt)];
  if (cursor !== null) {
    const [, time = '', post = ''] = CURSOR.exec(cursor) ?? [];
    // Both parts must fit PostgreSQL's bigint, or the cast in the query fails.
    const before = parseId(time);
    const postId = parseId(post);
    if (before === null || postId === null) return { ok: false, error: 'BAD_CURSOR' };
    where.push(
      sql`(${bookmarks.createdAt}, ${bookmarks.postId}) < (to_timestamp(0) + ${before}::bigint * interval '1 microsecond', ${postId}::bigint)`,
    );
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
