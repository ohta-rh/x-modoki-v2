import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb, media } from '@/shared/db';
import { sniffImage } from '@/shared/lib/image';
import { readHead } from '@/shared/storage';

/**
 * Whether every upload is the owner's, still `pending`, really in storage, and really the declared
 * type and size — read from the stored object's first bytes, not from what the browser said
 * (#25, threat model T-07, T-08). A duplicate id finds one row for two ids, so it fails too.
 */
export async function checkUploads(ownerId: string, ids: bigint[]): Promise<boolean> {
  const rows = await getDb()
    .select()
    .from(media)
    .where(and(inArray(media.id, ids), eq(media.ownerId, ownerId), eq(media.status, 'pending')));
  if (rows.length !== ids.length) return false;
  // 1KB: a JPEG's size comes after its tables, well past the first 32 bytes (ADR-0043).
  const heads = await Promise.all(rows.map((row) => readHead(row.key, 1024)));
  return rows.every((row, i) => {
    const found = heads[i] ? sniffImage(heads[i]) : null;
    return (
      found !== null &&
      found.type === row.mime &&
      found.width === row.width &&
      found.height === row.height
    );
  });
}
