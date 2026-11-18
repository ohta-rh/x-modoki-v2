import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { posts } from '@/shared/db';
import { createPostAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('createPostAction', () => {
  it('投稿して ok を返す', async () => {
    signInAs(await makeUser());
    expect(await createPostAction('こんにちは')).toEqual({ ok: true });
    expect(await testDb().select().from(posts)).toHaveLength(1);
  });

  it.each([
    ['文字列でない入力', 42, '本文を確かめてください'],
    ['空の本文', '  ', '本文を確かめてください'],
  ])('%s は、画面に出す文言で返す', async (_, input, message) => {
    signInAs(await makeUser());
    expect(await createPostAction(input as string)).toEqual({ ok: false, message });
  });

  it('ログインが無ければ、ログインを求める文言', async () => {
    expect(await createPostAction('こんにちは')).toEqual({
      ok: false,
      message: 'ログインしてください',
    });
  });

  it('回数の制限を超えたら、待つように言う', async () => {
    // hitRateLimit counts in one-minute windows; pin the clock mid-minute so the 11 calls share one.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T12:00:10Z'));
    signInAs(await makeUser());
    let result;
    for (let i = 0; i < 11; i += 1) result = await createPostAction(`投稿 ${i}`);
    expect(result).toEqual({
      ok: false,
      message: '投稿が多すぎます。しばらく待ってから、もう一度お試しください',
    });
    vi.useRealTimers();
  });
});
