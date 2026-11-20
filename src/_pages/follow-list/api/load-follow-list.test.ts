import { makeFollow, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadFollowList } from './load-follow-list';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

setupTestDb();
beforeEach(signOut);

describe('loadFollowList（#24）', () => {
  it('プロフィールと一覧の 1 ページ目と、入っているかを返す。無いユーザーは 404', async () => {
    const hana = await makeUser({ username: 'hana', name: '花' });
    const fan = await makeUser({ username: 'fan' });
    await makeFollow(fan.id, hana.id);
    const data = await loadFollowList('Hana', 'followers');
    expect(data.profile.name).toBe('花');
    expect(data.type).toBe('followers');
    expect(data.firstPage.items.map((item) => item.username)).toEqual(['fan']);
    expect(data.signedIn).toBe(false);
    signInAs(fan);
    expect((await loadFollowList('hana', 'following')).signedIn).toBe(true);
    await expect(loadFollowList('nobody', 'followers')).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
