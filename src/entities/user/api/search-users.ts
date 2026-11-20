import 'server-only';
import { and, desc, sql, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, user } from '@/shared/db';
import { mediaUrl } from '@/shared/lib/media-url';
import { likePattern } from '@/shared/lib/text';
import type { FollowPage } from '../model/types';

const PAGE_SIZE = 20;
/** `<followers count>_<user id>`, the order it pages in. */
const CURSOR = /^(0|[1-9]\d{0,9})_(.+)$/;

/**
 * People whose name or username contains `q`: exactly the `users_search_trgm_idx` expression, so
 * the index serves it (its test runs EXPLAIN on this).
 */
export const userSearchMatch = (q: string) =>
  sql`(${user.name} || ' ' || coalesce(${user.username}, '')) ILIKE ${likePattern(q)} ESCAPE '\\'`;

export type SearchUsersResult =
  { ok: true; page: FollowPage } | { ok: false; error: 'BAD_CURSOR' | 'UNAUTHORIZED' };

/**
 * People whose name or username contains `q` (#27), most followed first, 20 at a time, with
 * whether the viewer follows each. The match is the `users_search_trgm_idx` expression exactly,
 * so the index serves it.
 */
export async function searchUsers(q: string, cursor: string | null): Promise<SearchUsersResult> {
  // Search is for people signed in (routing.md 1): checked here too, not only by proxy.ts (#33).
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const viewerId = viewer.id;
  const where: SQL[] = [userSearchMatch(q)];
  if (cursor !== null) {
    const [, followers = '', id = ''] = CURSOR.exec(cursor) ?? [];
    // The count must fit the integer column, or PostgreSQL refuses the cast (review 1).
    if (followers === '' || Number(followers) > 2_147_483_647) {
      return { ok: false, error: 'BAD_CURSOR' };
    }
    where.push(sql`(${user.followersCount}, ${user.id}) < (${Number(followers)}::integer, ${id})`);
  }
  const rows = await getDb()
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      bio: user.bio,
      followers: user.followersCount,
      isFollowing: sql<boolean>`exists (select 1 from follows v where v.follower_id = ${viewerId} and v.followee_id = ${user.id})`,
    })
    .from(user)
    .where(and(...where))
    .orderBy(desc(user.followersCount), desc(user.id))
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
      nextCursor: rows.length > PAGE_SIZE ? `${last.followers}_${last.id}` : null,
    },
  };
}
