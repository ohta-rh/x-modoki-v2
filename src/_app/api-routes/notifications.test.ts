import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNotificationList, getUnreadCount } from './notifications';

// Reading only the viewer's own notifications is tested against PostgreSQL in
// entities/notification (get-notifications.test.ts, count-unread.test.ts).
const getNotifications = vi.fn();
vi.mock('@/entities/notification/index.server', () => ({
  countUnread: async () => 4,
  getNotifications: (...args: unknown[]) => getNotifications(...args),
}));

beforeEach(() => getNotifications.mockReset());

describe('GET /api/notifications/unread-count（#26）', () => {
  it('自分の未読の数を返し、キャッシュさせない', async () => {
    const response = await getUnreadCount();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 4 });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

describe('GET /api/notifications（#26）', () => {
  const call = (query: string) =>
    getNotificationList(new Request(`http://localhost:3000/api/notifications${query}`));

  it('タブとカーソルを渡し、ページを返す。タブが無ければ全部', async () => {
    getNotifications.mockResolvedValue({ ok: true, page: { items: [], nextCursor: '5' } });
    const response = await call('?tab=mentions&cursor=9');
    expect(await response.json()).toEqual({ items: [], nextCursor: '5' });
    expect(getNotifications).toHaveBeenLastCalledWith('mentions', '9');
    await call('?tab=all&cursor=');
    expect(getNotifications).toHaveBeenLastCalledWith('all', null);
    await call('?cursor=');
    expect(getNotifications).toHaveBeenLastCalledWith('all', null);
  });

  // NFR-SEC-02: 形の違う入力は 400
  it('知らない tab は 400 で、一覧を読まない（#62）', async () => {
    getNotifications.mockClear();
    const response = await call('?tab=other');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'VALIDATION' });
    expect(getNotifications).not.toHaveBeenCalled();
  });

  it('ログインしていなければ 401、カーソルが壊れていれば 400', async () => {
    getNotifications.mockResolvedValueOnce({ ok: false, error: 'UNAUTHORIZED' });
    expect((await call('')).status).toBe(401);
    getNotifications.mockResolvedValueOnce({ ok: false, error: 'BAD_CURSOR' });
    const bad = await call('?cursor=x');
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: 'VALIDATION' });
  });
});
