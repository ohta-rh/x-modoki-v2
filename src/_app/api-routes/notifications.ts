import { countUnread, getNotifications } from '@/entities/notification/index.server';

/** GET /api/notifications/unread-count — the badge's number, polled by the client (#26, ADR-0011). */
export async function getUnreadCount(): Promise<Response> {
  return Response.json(
    { count: await countUnread() },
    { headers: { 'cache-control': 'no-store' } },
  );
}

/** GET /api/notifications?tab=&cursor= — the next page of the viewer's own notifications (#26). */
export async function getNotificationList(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const tab = params.get('tab') === 'mentions' ? 'mentions' : 'all';
  // No cursor, or an empty one (the client's first page), means the newest page.
  const result = await getNotifications(tab, params.get('cursor') || null);
  if (result.ok) return Response.json(result.page);
  return Response.json(
    { error: result.error === 'BAD_CURSOR' ? 'VALIDATION' : result.error },
    { status: result.error === 'BAD_CURSOR' ? 400 : 401 },
  );
}
