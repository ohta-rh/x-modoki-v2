import { z } from 'zod';
import { countUnread, getNotifications } from '@/entities/notification/index.server';

/** GET /api/notifications/unread-count — the badge's number, polled by the client (#26, ADR-0011). */
export async function getUnreadCount(): Promise<Response> {
  const count = await countUnread();
  if (count === null) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  return Response.json({ count }, { headers: { 'cache-control': 'no-store' } });
}

/** GET /api/notifications?tab=&cursor= — the next page of the viewer's own notifications (#26). */
export async function getNotificationList(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  // NFR-SEC-02: a tab it does not know is refused, not read as 「すべて」 (#62).
  const tab = z
    .enum(['all', 'mentions'])
    .default('all')
    .safeParse(params.get('tab') ?? undefined);
  if (!tab.success) return Response.json({ error: 'VALIDATION' }, { status: 400 });
  // No cursor, or an empty one (the client's first page), means the newest page.
  const result = await getNotifications(tab.data, params.get('cursor') || null);
  if (result.ok) return Response.json(result.page);
  return Response.json(
    { error: result.error === 'BAD_CURSOR' ? 'VALIDATION' : result.error },
    { status: result.error === 'BAD_CURSOR' ? 400 : 401 },
  );
}
