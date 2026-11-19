import { makeFollow, makePost, makeUser } from '@test/factories';
import { countQueries, setupTestDb } from '@test/db';
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

  // NFR-PERF-04: ホームの最初の描画の問い合わせ
  it('ホームの最初の 1 ページの問い合わせは 6 回以下で、投稿が 20 件でも 40 件でも同じ回数（#32）', async () => {
    const me = await makeUser();
    const friend = await makeUser();
    await makeFollow(me.id, friend.id);
    signInAs(me);
    const counts: number[] = [];
    let made = 0;
    for (const total of [20, 40]) {
      for (; made < total; made += 1) await makePost({ authorId: friend.id, text: `投稿 ${made}` });
      counts.push(await countQueries(() => loadHomePage('following')));
    }
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[0]).toBeLessThanOrEqual(6);
    expect(counts[1]).toBe(counts[0]);
  });
});
