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

export type SearchUsersResult = { ok: true; page: FollowPage } | { ok: false; error: 'BAD_CURSOR' };

/**
 * People whose name or username contains `q` (#27), most followed first, 20 at a time, with
 * whether the viewer follows each. The match is the `users_search_trgm_idx` expression exactly,
 * so the index serves it.
 */
export async function searchUsers(q: string, cursor: string | null): Promise<SearchUsersResult> {
  const viewerId = (await getSession())?.id ?? null;
  const where: SQL[] = [
    sql`(${user.name} || ' ' || coalesce(${user.username}, '')) ILIKE ${likePattern(q)} ESCAPE '\\'`,
  ];
  if (cursor !== null) {
    const [, followers = '', id = ''] = CURSOR.exec(cursor) ?? [];
    if (followers === '') return { ok: false, error: 'BAD_CURSOR' };
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
      isFollowing: viewerId
        ? sql<boolean>`exists (select 1 from follows v where v.follower_id = ${viewerId} and v.followee_id = ${user.id})`
        : sql<boolean>`false`,
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
