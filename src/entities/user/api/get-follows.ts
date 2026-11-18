import 'server-only';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { follows, getDb, user } from '@/shared/db';
import { mediaUrl } from '@/shared/lib/media-url';
import { parseId } from '@/shared/lib/id';
import type { FollowListType, FollowPage } from '../model/types';

const PAGE_SIZE = 20;
// `<microseconds of the follow>_<the other user's id>`, exact as in ADR-0040.
const CURSOR = /^(\d+)_(.+)$/;

export type FollowsResult =
  { ok: true; page: FollowPage } | { ok: false; error: 'NOT_FOUND' | 'BAD_CURSOR' };

/**
 * Who a user follows, or who follows them (#24): newest follow first, 20 at a time, each with
 * whether the viewer follows that person. Signed-out visitors may read it.
 */
export async function getFollows(
  username: string,
  type: FollowListType,
  cursor: string | null,
): Promise<FollowsResult> {
  const viewerId = (await getSession())?.id ?? null;
  const db = getDb();
  const [owner] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.username})`, username.toLowerCase()));
  if (!owner) return { ok: false, error: 'NOT_FOUND' };
  // The owner is on one side of the follow; the listed people are on the other.
  const [mine, theirs] =
    type === 'following'
      ? [follows.followerId, follows.followeeId]
      : [follows.followeeId, follows.followerId];
  const where: SQL[] = [eq(mine, owner.id)];
  if (cursor !== null) {
    const [, micros = '', otherId = ''] = CURSOR.exec(cursor) ?? [];
    const before = parseId(micros);
    if (before === null) return { ok: false, error: 'BAD_CURSOR' };
    where.push(
      sql`(${follows.createdAt}, ${theirs}) < (to_timestamp(0) + ${before}::bigint * interval '1 microsecond', ${otherId})`,
    );
  }
  const rows = await db
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      bio: user.bio,
      micros: sql<string>`(extract(epoch from ${follows.createdAt}) * 1000000)::bigint::text`,
      isFollowing: viewerId
        ? sql<boolean>`exists (select 1 from follows v where v.follower_id = ${viewerId} and v.followee_id = ${user.id})`
        : sql<boolean>`false`,
    })
    .from(follows)
    .innerJoin(user, eq(user.id, theirs))
    .where(and(...where))
    .orderBy(desc(follows.createdAt), desc(theirs))
    .limit(PAGE_SIZE + 1);
  const page = rows.slice(0, PAGE_SIZE);
  const last = page[PAGE_SIZE - 1];
  return {
    ok: true,
    page: {
      items: page.map((row) => ({
        username: row.username!,
        name: row.name,
        avatarUrl: mediaUrl(row.image),
        bio: row.bio,
        isFollowing: row.isFollowing,
        isSelf: row.id === viewerId,
      })),
      nextCursor: rows.length > PAGE_SIZE ? `${last.micros}_${last.id}` : null,
    },
  };
}
