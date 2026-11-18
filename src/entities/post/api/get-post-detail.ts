import 'server-only';
import { and, asc, eq, gt, isNull, or } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, posts, user } from '@/shared/db';
import { toIdString } from '@/shared/lib/id';
import type { Post, PostDetail, PostPage, ThreadItem } from '../model/types';
import { postColumns, toPost } from './post-rows';

const PAGE_SIZE = 20;

export type PostDetailResult = { ok: true; detail: PostDetail } | { ok: false; error: 'NOT_FOUND' };

/** Direct replies to a post, oldest first, 20 at a time (GET /api/posts/{id}/replies). */
export async function getReplies(postId: bigint, cursor: bigint | null): Promise<PostPage> {
  const viewerId = (await getSession())?.id ?? null;
  const where = [eq(posts.replyToId, postId), isNull(posts.deletedAt)];
  if (cursor !== null) where.push(gt(posts.id, cursor));
  const rows = await getDb()
    .select(postColumns(viewerId))
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(and(...where))
    .orderBy(asc(posts.id))
    .limit(PAGE_SIZE + 1);
  const items = rows.slice(0, PAGE_SIZE).map((row) => toPost(row, viewerId));
  return { items, nextCursor: rows.length > PAGE_SIZE ? items[PAGE_SIZE - 1].id : null };
}

/**
 * A post with the posts above it and the first page of replies (#20). The whole thread above is
 * read in one query by root_id and walked up by reply_to_id; deleted posts above stay as marks.
 * Signed-out visitors may read it (routing.md 1).
 */
export async function getPostDetail(postId: bigint): Promise<PostDetailResult> {
  const viewerId = (await getSession())?.id ?? null;
  const db = getDb();
  const [main] = await db
    .select(postColumns(viewerId))
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)));
  if (!main) return { ok: false, error: 'NOT_FOUND' };

  const ancestors: ThreadItem[] = [];
  const rootId = main.post.rootId;
  if (rootId !== null) {
    const rows = await db
      .select(postColumns(viewerId))
      .from(posts)
      .innerJoin(user, eq(user.id, posts.authorId))
      .where(or(eq(posts.id, rootId), eq(posts.rootId, rootId)));
    const byId = new Map(rows.map((row) => [row.post.id, row]));
    for (let at = main.post.replyToId; at !== null;) {
      // Every post above shares the root, so the one query above holds it.
      const row = byId.get(at)!;
      ancestors.unshift(
        row.post.deletedAt ? { id: toIdString(row.post.id), deleted: true } : toPost(row, viewerId),
      );
      at = row.post.replyToId;
    }
  }
  const post: Post = toPost(main, viewerId);
  return { ok: true, detail: { post, ancestors, replies: await getReplies(postId, null) } };
}
