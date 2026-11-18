import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashtags, mentions, postHashtags, posts, user } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { createPost } from './create-post';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('createPost（FR-POST、NFR-SEC-01・02・05）', () => {
  it('ログインが無ければ UNAUTHORIZED で、何も書かない', async () => {
    expect(await createPost('こんにちは')).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect(await testDb().select().from(posts)).toEqual([]);
  });

  it.each([
    ['空', '   '],
    ['281 の重み', 'a'.repeat(281)],
  ])('%s の本文は VALIDATION', async (_, text) => {
    signInAs(await makeUser());
    expect(await createPost(text)).toEqual({ ok: false, error: 'VALIDATION' });
    expect(await testDb().select().from(posts)).toEqual([]);
  });

  it('NFC にそろえた本文で投稿を作り、作者の投稿の数を 1 増やす', async () => {
    const me = await makeUser();
    signInAs(me);
    const result = await createPost('がです');
    expect(result).toEqual({ ok: true, id: expect.stringMatching(/^\d+$/) });
    const [row] = await testDb().select().from(posts);
    expect(row.text).toBe('がです');
    expect(row.authorId).toBe(me.id);
    expect((await testDb().select().from(user).where(eq(user.id, me.id)))[0].postsCount).toBe(1);
  });

  it('ハッシュタグ（小文字にそろえて重ねない）とメンション（実在する人だけ）を、同じ投稿に結ぶ', async () => {
    const me = await makeUser();
    const taro = await makeUser({ username: 'taro_x' });
    signInAs(me);
    const result = await createPost('#Next と #next と #ハッシュ @Taro_X @taro_x @nobody_here');
    if (!result.ok) throw new Error('expected ok');
    expect(
      (await testDb().select({ tag: hashtags.tag }).from(hashtags)).map((row) => row.tag).sort(),
    ).toEqual(['next', 'ハッシュ']);
    expect(await testDb().select().from(postHashtags)).toHaveLength(2);
    expect(await testDb().select({ userId: mentions.userId }).from(mentions)).toEqual([
      { userId: taro.id },
    ]);
  });

  it('実在しない人だけへのメンションは、結ばずに投稿する', async () => {
    signInAs(await makeUser());
    expect((await createPost('@nobody_here こんにちは')).ok).toBe(true);
    expect(await testDb().select().from(mentions)).toEqual([]);
  });

  it('既にあるハッシュタグは作り直さず、結ぶだけ', async () => {
    const me = await makeUser();
    signInAs(me);
    await createPost('#共通');
    await createPost('#共通 もう一度');
    expect(await testDb().select().from(hashtags)).toHaveLength(1);
    expect(await testDb().select().from(postHashtags)).toHaveLength(2);
  });

  it('途中で失敗したら、投稿もハッシュタグも残さない（1 つのトランザクション）', async () => {
    signInAs(await makeUser());
    let calls = 0;
    const failingIds = () => {
      calls += 1;
      if (calls > 1) throw new Error('boom');
      return newId();
    };
    await expect(createPost('#残らない', { newId: failingIds })).rejects.toThrow('boom');
    expect(await testDb().select().from(posts)).toEqual([]);
    expect(await testDb().select().from(hashtags)).toEqual([]);
  });

  it('ADR-0016: ID がぶつかったら、作り直して 1 回だけやり直す', async () => {
    const me = await makeUser();
    const taken = newId();
    await makePost({ id: taken, authorId: me.id });
    signInAs(me);
    const ids = [taken, newId()];
    const result = await createPost('ぶつかる', { newId: () => ids.shift() ?? newId() });
    expect(result.ok).toBe(true);
    expect(await testDb().select().from(posts)).toHaveLength(2);
  });

  it('NFR-SEC-05: 同じ人の 11 回目は 1 分の中で RATE_LIMITED', async () => {
    // hitRateLimit counts in one-minute windows; pin the clock mid-minute so the 11 calls share one.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T12:00:10Z'));
    signInAs(await makeUser());
    for (let i = 0; i < 10; i += 1) expect((await createPost(`投稿 ${i}`)).ok).toBe(true);
    expect(await createPost('11 回目')).toEqual({ ok: false, error: 'RATE_LIMITED' });
    vi.useRealTimers();
  });
});
