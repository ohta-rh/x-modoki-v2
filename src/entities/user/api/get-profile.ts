import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { follows, getDb, user } from '@/shared/db';
import { mediaUrl } from '@/shared/lib/media-url';
import type { Profile } from '../model/types';

export type ProfileResult = { ok: true; profile: Profile } | { ok: false; error: 'NOT_FOUND' };

/** A profile by username, in any case (#23). Signed-out visitors may read it (routing.md 1). */
export async function getProfile(username: string): Promise<ProfileResult> {
  const viewer = await getSession();
  const [row] = await getDb()
    .select()
    .from(user)
    .where(eq(sql`lower(${user.username})`, username.toLowerCase()));
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  const followed = viewer
    ? await getDb()
        .select({ id: follows.followeeId })
        .from(follows)
        .where(and(eq(follows.followerId, viewer.id), eq(follows.followeeId, row.id)))
    : [];
  return {
    ok: true,
    profile: {
      username: row.username!,
      name: row.name,
      avatarUrl: mediaUrl(row.image),
      bannerUrl: mediaUrl(row.banner),
      bio: row.bio,
      location: row.location,
      website: row.website,
      joinedAt: row.createdAt.toISOString(),
      followersCount: row.followersCount,
      followingCount: row.followingCount,
      postsCount: row.postsCount,
      isSelf: viewer?.id === row.id,
      isFollowing: followed.length > 0,
    },
  };
}
