import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadHomePage } from './load-home-page';

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

describe('loadHomePage', () => {
  it('入っていなければログインへ送る', async () => {
    await expect(loadHomePage(undefined)).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
  });

  it('tab=following ならフォロー中、それ以外はおすすめの 1 ページ目と、今の時刻を返す', async () => {
    const me = await makeUser();
    const stranger = await makeUser();
    await makePost({ authorId: stranger.id, text: '知らない人' });
    signInAs(me);
    const following = await loadHomePage('following');
    expect(following.kind).toBe('following');
    expect(following.firstPage.items).toEqual([]);
    for (const tab of [undefined, 'for-you', 'nonsense', ['following']]) {
      const forYou = await loadHomePage(tab);
      expect(forYou.kind).toBe('for-you');
      expect(forYou.firstPage.items.map((post) => post.text)).toEqual(['知らない人']);
    }
    expect(Date.parse(following.now)).not.toBeNaN();
  });
});
