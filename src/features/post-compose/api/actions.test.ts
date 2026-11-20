import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { makeUpload } from '@test/uploads';
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
    const result = await createPostAction('こんにちは');
    const rows = await testDb().select().from(posts);
    expect(rows).toHaveLength(1);
    // The new post's id, for the toast's 表示 link (#28).
    expect(result).toEqual({ ok: true, id: rows[0].id.toString() });
  });

  it.each([
    ['文字列でない入力', 42, '本文を確かめてください'],
    ['空の本文', '  ', '本文を確かめてください'],
  ])('%s は、画面に出す文言で返す', async (_, input, message) => {
    signInAs(await makeUser());
    expect(await createPostAction(input as string)).toEqual({ ok: false, message });
  });

  // AUTHZ: createPostAction UNAUTHORIZED
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
    expect(await createReplyAction('返信', parent.id.toString())).toEqual({
      ok: true,
      id: expect.stringMatching(/^\d+$/),
    });
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
    expect(await createQuoteAction('意見', post.id.toString())).toEqual({
      ok: true,
      id: expect.stringMatching(/^\d+$/),
    });
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

describe('createPostAction の画像（#25）', () => {
  it('画像の ID（文字列）と代替テキストを受け取って投稿する。形の違う画像の指定は本文を確かめるよう言う', async () => {
    const me = await makeUser();
    signInAs(me);
    const upload = await makeUpload(me.id);
    expect(await createPostAction('', [{ id: upload.id.toString(), alt: '青' }])).toEqual({
      ok: true,
      id: expect.stringMatching(/^\d+$/),
    });
    for (const bad of [[{ id: 'abc', alt: '' }], [{ id: '1' }], 'not a list']) {
      expect(await createPostAction('本文', bad as never)).toEqual({
        ok: false,
        message: '本文を確かめてください',
      });
    }
  });
});

describe('返信と引用の Server Action（#33）', () => {
  // AUTHZ: createReplyAction UNAUTHORIZED
  // AUTHZ: createQuoteAction UNAUTHORIZED
  it('ログインが無ければ、ログインを求める文言で、何も書かない', async () => {
    const author = await makeUser();
    const post = await makePost({ authorId: author.id, text: '元' });
    expect(await createReplyAction('返信', post.id.toString())).toEqual({
      ok: false,
      message: 'ログインしてください',
    });
    expect(await createQuoteAction('引用', post.id.toString())).toEqual({
      ok: false,
      message: 'ログインしてください',
    });
    expect(await testDb().select().from(posts)).toHaveLength(1);
  });
});
