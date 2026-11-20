import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb, media } from '@/shared/db';
import { sniffImage } from '@/shared/lib/image';
import { copyObject, readHead, removeObject } from '@/shared/storage';

/** Where an upload is now: `from` is the key the browser could write to, `to` a copy it cannot. */
export type SealedUpload = { from: string; to: string };

/**
 * Seals the owner's `pending` uploads: each object is copied to a key the browser was never given,
 * and the copy — not what the browser said — must really be the declared type and size, read
 * from its first bytes (#25, threat model T-07, T-08). Checking the original would not do: its
 * signed URL stays valid for 60 seconds, so it could be overwritten after the check (#25 review 2).
 * Null when any upload is not the owner's, not pending, not in storage, or not what was declared;
 * the copies made so far are then removed. A duplicate id finds one row for two ids, so it fails.
 */
export async function sealUploads(
  ownerId: string,
  ids: bigint[],
  /** The exact size every image must have (an avatar, a banner); any size when absent. */
  size?: { width: number; height: number },
): Promise<Map<bigint, SealedUpload> | null> {
  const rows = await getDb()
    .select()
    .from(media)
    .where(and(inArray(media.id, ids), eq(media.ownerId, ownerId), eq(media.status, 'pending')));
  if (rows.length !== ids.length) return null;
  const sealed = await Promise.all(
    rows.map(async (row) => {
      const to = `media/${crypto.randomUUID()}.${row.key.split('.').at(-1)}`;
      const copied = await copyObject(row.key, to);
      // 1KB: a JPEG's size comes after its tables, well past the first 32 bytes (ADR-0043).
      const found = copied ? sniffImage((await readHead(to, 1024))!) : null;
      const ok =
        found !== null &&
        found.type === row.mime &&
        found.width === row.width &&
        found.height === row.height &&
        (size === undefined || (row.width === size.width && row.height === size.height));
      return { id: row.id, from: row.key, to, copied, ok };
    }),
  );
  if (sealed.every((upload) => upload.ok)) {
    return new Map(sealed.map((upload) => [upload.id, { from: upload.from, to: upload.to }]));
  }
  await Promise.all(
    sealed.filter((upload) => upload.copied).map((upload) => removeObject(upload.to)),
  );
  return null;
}
