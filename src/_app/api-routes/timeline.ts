import { countNewPosts, getTimeline } from '@/entities/post/index.server';
import type { TimelineKind } from '@/entities/post';
import { parseId } from '@/shared/lib/id';

const json = (body: unknown, status = 200) => Response.json(body, { status });

const timeline = (kind: TimelineKind) => async (request: Request) => {
  // No cursor, or an empty one (the client's first page), means the newest page.
  const raw = new URL(request.url).searchParams.get('cursor') || null;
  const cursor = raw === null ? null : parseId(raw);
  if (raw !== null && cursor === null) return json({ error: 'VALIDATION' }, 400);
  const result = await getTimeline(kind, cursor);
  return result.ok ? json(result.page) : json({ error: result.error }, 401);
};

/** GET /api/timeline/following?cursor= (application-structure.md 5). */
export const getFollowingTimeline = timeline('following');
/** GET /api/timeline/for-you?cursor= */
export const getForYouTimeline = timeline('for-you');

/** GET /api/timeline/following/new-count?since= (#28): posts above the newest shown, polled. */
export async function getFollowingNewCount(request: Request) {
  const since = parseId(new URL(request.url).searchParams.get('since') ?? '');
  if (since === null) return json({ error: 'VALIDATION' }, 400);
  const result = await countNewPosts(since);
  return result.ok ? json({ count: result.count }) : json({ error: result.error }, 401);
}
