import 'server-only';
import { and, desc, eq, exists, isNull, lt, sql, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, hashtags, postHashtags, postMedia, posts, user } from '@/shared/db';
import { parseId } from '@/shared/lib/id';
import { likePattern } from '@/shared/lib/text';
import type { PostPage } from '../model/types';
import { postColumns, toPosts } from './post-rows';

const PAGE_SIZE = 20;
/** 話題's cursor: `<like count>_<post id>`, the order it pages in. */
const TOP_CURSOR = /^(\d+)_(\d+)$/;

/** Posts whose text contains `q`, served by `posts_text_trgm_idx` (its test runs EXPLAIN on this). */
export const postTextMatch = (q: string) => sql`${posts.text} ILIKE ${likePattern(q)} ESCAPE '\\'`;

export type SearchPostsTab = 'top' | 'live' | 'media';
export type SearchPostsResult = { ok: true; page: PostPage } | { ok: false; error: 'BAD_CURSOR' };

/**
 * Posts for a search (#27, data-model.md 4): 話題 — the text contains `q`, most liked first;
 * 最新 — newest first; メディア — with images, newest first. A word starting with `#` is a hashtag,
 * matched exactly. The text match is ILIKE, which the `gin_trgm_ops` index serves. 20 at a time.
 */
export async function searchPosts(
  q: string,
  tab: SearchPostsTab,
  cursor: string | null,
): Promise<SearchPostsResult> {
  const viewerId = (await getSession())?.id ?? null;
  const db = getDb();
  const where: SQL[] = [isNull(posts.deletedAt)];
  if (q.startsWith('#')) {
    where.push(
      exists(
        db
          .select()
          .from(postHashtags)
          .innerJoin(hashtags, eq(hashtags.id, postHashtags.hashtagId))
          .where(
            and(eq(postHashtags.postId, posts.id), eq(hashtags.tag, q.slice(1).toLowerCase())),
          ),
      ),
    );
  } else {
    where.push(postTextMatch(q));
  }
  if (tab === 'media') {
    where.push(exists(db.select().from(postMedia).where(eq(postMedia.postId, posts.id))));
  }
  if (cursor !== null) {
    const after = tab === 'top' ? afterTop(cursor) : afterId(cursor);
    if (after === null) return { ok: false, error: 'BAD_CURSOR' };
    where.push(after);
  }
  const rows = await db
    .select(postColumns(viewerId))
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(and(...where))
    .orderBy(...(tab === 'top' ? [desc(posts.likeCount), desc(posts.id)] : [desc(posts.id)]))
    .limit(PAGE_SIZE + 1);
  const items = await toPosts(rows.slice(0, PAGE_SIZE), viewerId);
  const last = rows[PAGE_SIZE - 1]?.post;
  const nextCursor =
    rows.length > PAGE_SIZE
      ? tab === 'top'
        ? `${last.likeCount}_${last.id}`
        : last.id.toString()
      : null;
  return { ok: true, page: { items, nextCursor } };
}

function afterId(cursor: string): SQL | null {
  const before = parseId(cursor);
  return before === null ? null : lt(posts.id, before);
}

function afterTop(cursor: string): SQL | null {
  const [, likes = '', id = ''] = TOP_CURSOR.exec(cursor) ?? [];
  // A count may be 0, which is no id; it must fit an integer column.
  const beforeLikes = /^(0|[1-9]\d{0,9})$/.test(likes) ? Number(likes) : null;
  const beforeId = parseId(id);
  return beforeLikes === null || beforeLikes > 2_147_483_647 || beforeId === null
    ? null
    : sql`(${posts.likeCount}, ${posts.id}) < (${beforeLikes}::integer, ${beforeId}::bigint)`;
}
