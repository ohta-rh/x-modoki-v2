import 'server-only';
import { and, desc, isNotNull, ne, notExists, eq, type SQL } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { follows, getDb, user } from '@/shared/db';
import { mediaUrl } from '@/shared/lib/media-url';
import type { FollowUser } from '../model/types';

const SHOWN = 3;

/**
 * Who to follow (#27): the most followed people the viewer does not follow and is not, 3 of them.
 * Read per request (ADR-0048), so the viewer is left out in SQL rather than from a cached top
 * (review 1: a viewer following most of a fixed top got fewer than 3).
 */
export async function getSuggestions(): Promise<FollowUser[]> {
  const viewerId = (await getSession())?.id ?? null;
  const db = getDb();
  const where: SQL[] = [isNotNull(user.username)];
  if (viewerId !== null) {
    where.push(ne(user.id, viewerId));
    where.push(
      notExists(
        db
          .select()
          .from(follows)
          .where(and(eq(follows.followerId, viewerId), eq(follows.followeeId, user.id))),
      ),
    );
  }
  const rows = await db
    .select({ username: user.username, name: user.name, image: user.image, bio: user.bio })
    .from(user)
    .where(and(...where))
    .orderBy(desc(user.followersCount), desc(user.id))
    .limit(SHOWN);
  return rows.map((person) => ({
    username: person.username!,
    name: person.name,
    avatarUrl: mediaUrl(person.image),
    bio: person.bio,
    isFollowing: false,
    isSelf: false,
  }));
}
