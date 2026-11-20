import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifications } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { loadNotificationsPage } from './load-notifications-page';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

setupTestDb();
beforeEach(signOut);

describe('loadNotificationsPage（#26）', () => {
  it('入っていなければログインへ送る', async () => {
    await expect(loadNotificationsPage('all')).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
  });

  it('タブと、そのタブの 1 ページ目を返す', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    await testDb()
      .insert(notifications)
      .values({ id: newId(), recipientId: me.id, actorId: them.id, type: 'follow', postId: null });
    signInAs(me);
    const all = await loadNotificationsPage('all');
    expect(all.tab).toBe('all');
    expect(all.firstPage.items.map((item) => item.type)).toEqual(['follow']);
    expect((await loadNotificationsPage('mentions')).firstPage.items).toEqual([]);
  });
});
