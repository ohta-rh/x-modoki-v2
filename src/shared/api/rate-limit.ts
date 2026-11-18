import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb, rateLimits } from '@/shared/db';

type Options = { limit: number; windowMs: number; now?: number };

/**
 * Counts one hit for `key` in the current fixed window and says whether it is still allowed
 * (NFR-SEC-05). One UPSERT, so concurrent hits are counted exactly (ADR-0010).
 */
export async function hitRateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: Options,
): Promise<boolean> {
  const windowStart = new Date(now - (now % windowMs));
  const [row] = await getDb()
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}
