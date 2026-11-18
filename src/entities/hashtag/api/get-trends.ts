import 'server-only';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';
import { getDb, hashtags, postHashtags, posts } from '@/shared/db';
import type { Trend } from '../model/types';

const DAY = 24 * 3600 * 1000;

/**
 * The 10 hashtags on the most posts of the last 24 hours, with their counts (#27). Read per request,
 * not `'use cache'` (ADR-0048). `now` is for tests.
 */
export async function getTrends(now?: Date): Promise<Trend[]> {
  const since = new Date((now ?? new Date()).getTime() - DAY);
  const rows = await getDb()
    .select({ tag: hashtags.tag, count: count() })
    .from(postHashtags)
    .innerJoin(hashtags, eq(hashtags.id, postHashtags.hashtagId))
    .innerJoin(posts, eq(posts.id, postHashtags.postId))
    .where(and(gt(posts.createdAt, since), isNull(posts.deletedAt)))
    .groupBy(hashtags.tag)
    .orderBy(desc(count()), hashtags.tag)
    .limit(10);
  return rows;
}
