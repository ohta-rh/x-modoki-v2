import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb, posts } from '@/shared/db';

/** Adds one view to an undeleted post (#21). Anyone's view counts; no session is needed. */
export async function countView(postId: bigint): Promise<void> {
  await getDb()
    .update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)));
}
