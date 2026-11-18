import 'server-only';
import { type AnyColumn, type SQL, sql } from 'drizzle-orm';
import { parseId } from '@/shared/lib/id';

// Lists in the order something was done (bookmarked, liked) page by that time in whole
// microseconds (PostgreSQL's precision) and the post id: exact, so a page never skips or repeats
// rows made in the same instant (ADR-0040). The cursor is `<microseconds>_<post id>`.
const CURSOR = /^(\d+)_(\d+)$/;

/** The time column as the cursor's microseconds, read in SQL so JavaScript's Date never rounds it. */
export const microsOf = (time: AnyColumn) =>
  sql<string>`(extract(epoch from ${time}) * 1000000)::bigint::text`;

/** The condition for rows after `cursor`, or null when the cursor is malformed or out of range. */
export function afterTimeCursor(cursor: string, time: AnyColumn, postId: AnyColumn): SQL | null {
  const [, micros = '', id = ''] = CURSOR.exec(cursor) ?? [];
  // Both parts must fit PostgreSQL's bigint, or the cast in the query fails.
  const before = parseId(micros);
  const beforeId = parseId(id);
  if (before === null || beforeId === null) return null;
  return sql`(${time}, ${postId}) < (to_timestamp(0) + ${before}::bigint * interval '1 microsecond', ${beforeId}::bigint)`;
}
