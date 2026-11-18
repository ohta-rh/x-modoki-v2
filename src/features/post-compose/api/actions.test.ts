import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { posts } from '@/shared/db';
import { createPostAction, createQuoteAction, createReplyAction } from './actions';

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

describe('createReplyAction', () => {
  it('返信して ok を返す', async () => {
    const me = await makeUser();
    const parent = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await createReplyAction('返信', parent.id.toString())).toEqual({ ok: true });
  });

  it.each(['abc', '999999999999999'])('ID %s の投稿が無ければ、見つからないと言う', async (id) => {
    signInAs(await makeUser());
    expect(await createReplyAction('返信', id)).toEqual({
      ok: false,
      message: 'この投稿は見つかりません',
    });
  });

  it('文字列でない本文は、本文を確かめるよう言う', async () => {
    signInAs(await makeUser());
    expect(await createReplyAction(42 as unknown as string, '1')).toEqual({
      ok: false,
      message: '本文を確かめてください',
    });
  });
});

describe('createQuoteAction（#22）', () => {
  it('引用して ok を返す。元が無い・数字でない ID・文字列でない本文は、それぞれの文言', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await createQuoteAction('意見', post.id.toString())).toEqual({ ok: true });
    for (const id of ['999999999999999', 'abc']) {
      expect(await createQuoteAction('意見', id)).toEqual({
        ok: false,
        message: 'この投稿は見つかりません',
      });
    }
    expect(await createQuoteAction(42 as unknown as string, post.id.toString())).toEqual({
      ok: false,
      message: '本文を確かめてください',
    });
  });
});
