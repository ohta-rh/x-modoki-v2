import { cleanupMedia } from '@/features/media-cleanup/index.server';

/**
 * POST /api/cron/cleanup-media — removes the uploads nothing took (#25). Called once a day
 * (by hand locally, by a Cron Trigger in production: environments.md) with
 * `Authorization: Bearer <CRON_SECRET>`; the feature checks it, anyone else gets 401 (T-15).
 */
export async function postCleanupMedia(request: Request): Promise<Response> {
  const result = await cleanupMedia({ authorization: request.headers.get('authorization') });
  return result.ok
    ? Response.json({ removed: result.removed })
    : Response.json({ error: result.error }, { status: 401 });
}
