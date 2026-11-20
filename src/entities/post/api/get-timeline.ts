import 'server-only';
import { and, desc, eq, inArray, isNull, lt, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getSession } from '@/shared/auth/index.server';
import { follows, getDb, posts, user } from '@/shared/db';
import type { PostPage, TimelineKind } from '../model/types';
import { newId } from '@/shared/lib/id';
import { postColumns, toPost, toRepostedBy } from './post-rows';

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
  // Each row shows a post: a repost row its original (a deleted original drops the row), any other
  // row itself. Read in this one statement, with who reposted it (#22, #32).
  const shown = alias(posts, 'shown');
  const reposter = alias(user, 'reposter');
  const rows = await db
    .select({
      ...postColumns(viewer.id, shown),
      rowId: posts.id,
      reposter: { username: reposter.username, name: reposter.name, image: reposter.image },
    })
    .from(posts)
    .innerJoin(
      shown,
      and(eq(shown.id, sql`coalesce(${posts.repostOfId}, ${posts.id})`), isNull(shown.deletedAt)),
    )
    .innerJoin(user, eq(user.id, shown.authorId))
    .leftJoin(reposter, and(eq(reposter.id, posts.authorId), sql`${posts.repostOfId} is not null`))
    .where(and(...where))
    .orderBy(desc(posts.id))
    .limit(PAGE_SIZE + 1);
  const items = rows
    .slice(0, PAGE_SIZE)
    .map((row) => toPost(row, viewer.id, toRepostedBy(row.reposter)));
  // The cursor is the last row's ID: a repost row's own, not its original's (#22).
  const nextCursor = rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].rowId.toString() : null;
  if (cursor !== null) return { ok: true, page: { items, nextCursor } };
  // The first page says where it starts: the top row's own ID, or now when the list is empty.
  const newestId = (rows[0]?.rowId ?? newId({ random: 0 })).toString();
  return { ok: true, page: { items, nextCursor, newestId } };
}
