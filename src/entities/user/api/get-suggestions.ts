import 'server-only';
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { follows, getDb, user } from '@/shared/db';
import { mediaUrl } from '@/shared/lib/media-url';
import type { FollowUser } from '../model/types';

/** Enough of the top that 3 remain after the viewer and whom they follow are taken out. */
const TOP = 20;
const SHOWN = 3;

/** The most followed users: the same for everyone, read per request (ADR-0048). */
async function topUsers() {
  return getDb()
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      bio: user.bio,
    })
    .from(user)
    .where(isNotNull(user.username))
    .orderBy(desc(user.followersCount), desc(user.id))
    .limit(TOP);
}

/**
 * Who to follow (#27): the top, without the viewer and the people they already follow, 3 of them.
 */
export async function getSuggestions(): Promise<FollowUser[]> {
  const viewerId = (await getSession())?.id ?? null;
  const top = await topUsers();
  const followed =
    viewerId === null
      ? []
      : await getDb()
          .select({ id: follows.followeeId })
          .from(follows)
          .where(
            and(
              eq(follows.followerId, viewerId),
              inArray(
                follows.followeeId,
                top.map((person) => person.id),
              ),
            ),
          );
  const hidden = new Set([viewerId, ...followed.map((row) => row.id)]);
  return top
    .filter((person) => !hidden.has(person.id))
    .slice(0, SHOWN)
    .map((person) => ({
      username: person.username!,
      name: person.name,
      avatarUrl: mediaUrl(person.image),
      bio: person.bio,
      isFollowing: false,
      isSelf: false,
    }));
}
