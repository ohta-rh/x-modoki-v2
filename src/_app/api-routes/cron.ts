import { cleanupMedia } from '@/features/media-cleanup/index.server';
import { env } from '@/shared/config';

/** Compares without stopping at the first difference, so the time taken does not leak the secret. */
function sameSecret(given: string, expected: string): boolean {
  let difference = given.length ^ expected.length;
  for (let i = 0; i < expected.length; i += 1) {
    difference |= (given.charCodeAt(i) || 0) ^ expected.charCodeAt(i);
  }
  return difference === 0;
}

/**
 * POST /api/cron/cleanup-media — removes the uploads nothing took (#25). Called once a day
 * (by hand locally, by a Cron Trigger in production: environments.md) with
 * `Authorization: Bearer <CRON_SECRET>`; anyone else gets 401 (threat model T-15).
 */
export async function postCleanupMedia(request: Request): Promise<Response> {
  const authorization = request.headers.get('authorization') ?? '';
  return sameSecret(authorization, `Bearer ${env.CRON_SECRET}`)
    ? Response.json(await cleanupMedia())
    : Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}
