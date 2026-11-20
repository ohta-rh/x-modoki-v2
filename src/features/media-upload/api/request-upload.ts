import 'server-only';
import { hitRateLimit } from '@/shared/api/index.server';
import { getSession } from '@/shared/auth/index.server';
import { getDb, media } from '@/shared/db';
import { newId, toIdString } from '@/shared/lib/id';
import { presignUpload } from '@/shared/storage';
import { type UploadRequest, uploadRequestSchema } from '../model/schema';

export type RequestUploadResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: 'UNAUTHORIZED' | 'VALIDATION' | 'RATE_LIMITED' };

const EXTENSION = { 'image/webp': 'webp', 'image/gif': 'gif', 'image/jpeg': 'jpg' } as const;

/**
 * Starts an upload (#25, ADR-0008): records a `pending` media row under an unguessable key and
 * returns a 60-second URL signed for exactly the declared type and size (threat model T-07, T-08).
 */
export async function requestUpload(input: unknown): Promise<RequestUploadResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'VALIDATION' };
  if (!(await hitRateLimit(`upload:${viewer.id}`, { limit: 30, windowMs: 60_000 }))) {
    return { ok: false, error: 'RATE_LIMITED' };
  }
  const request: UploadRequest = parsed.data;
  const key = `media/${crypto.randomUUID()}.${EXTENSION[request.contentType]}`;
  const id = newId();
  await getDb().insert(media).values({
    id,
    ownerId: viewer.id,
    key,
    mime: request.contentType,
    width: request.width,
    height: request.height,
  });
  const url = await presignUpload({
    key,
    contentType: request.contentType,
    contentLength: request.contentLength,
  });
  return { ok: true, id: toIdString(id), url };
}
