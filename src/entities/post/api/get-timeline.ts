import 'server-only';
import { and, desc, eq, inArray, isNull, lt, or, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { follows, getDb, posts, user } from '@/shared/db';
import type { PostPage, TimelineKind } from '../model/types';
import { postColumns, toPosts } from './post-rows';

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
    .select(postColumns(viewer.id))
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(and(...where))
    .orderBy(desc(posts.id))
    .limit(PAGE_SIZE + 1);
  const items = await toPosts(rows.slice(0, PAGE_SIZE), viewer.id);
  // The cursor is the last row's ID: a repost row's own, not its original's (#22).
  const nextCursor = rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].post.id.toString() : null;
  return { ok: true, page: { items, nextCursor } };
}
