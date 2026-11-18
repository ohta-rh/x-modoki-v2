import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { likes, posts } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { setLike } from './set-like';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const count = async (id: bigint) =>
  (await testDb().select().from(posts).where(eq(posts.id, id)))[0].likeCount;

describe('setLike（data-model.md の 4 節、#21）', () => {
  it('いいねすると likes に 1 行入り、数が 1 増える。取り消すと戻る', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await setLike(post.id, true)).toEqual({ ok: true, liked: true, count: 1 });
    const rows = await testDb()
      .select()
      .from(likes)
      .where(and(eq(likes.userId, me.id), eq(likes.postId, post.id)));
    expect(rows).toHaveLength(1);
    expect(await setLike(post.id, false)).toEqual({ ok: true, liked: false, count: 0 });
    expect(await testDb().select().from(likes)).toHaveLength(0);
  });

  it('同時に 2 回いいねしても、数は 1 しか増えない', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    await Promise.all([setLike(post.id, true), setLike(post.id, true), setLike(post.id, true)]);
    expect(await count(post.id)).toBe(1);
  });

  it('いいねしていないのに取り消しても、数は 0 より小さくならない', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await setLike(post.id, false)).toEqual({ ok: true, liked: false, count: 0 });
    await Promise.all([setLike(post.id, true), setLike(post.id, false), setLike(post.id, false)]);
    expect(await count(post.id)).toBeGreaterThanOrEqual(0);
    const liked = (await testDb().select().from(likes)).length;
    expect(await count(post.id)).toBe(liked);
  });

  it('ログイン無しは UNAUTHORIZED、無い投稿と削除済みの投稿は NOT_FOUND', async () => {
    const me = await makeUser();
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    expect(await setLike(gone.id, true)).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    signInAs(me);
    expect(await setLike(gone.id, true)).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await setLike(newId(), false)).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await testDb().select().from(likes)).toHaveLength(0);
  });
});

describe('setLike の同時の操作（#21 のレビュー）', () => {
  it('別の人が同じ投稿に同時に押しても、行き詰まらず、全員の分が数えられる', async () => {
    const author = await makeUser();
    const post = await makePost({ authorId: author.id });
    const calls = [];
    for (let i = 0; i < 8; i++) {
      signInAs(await makeUser());
      // getSession is read when the call starts, so each call is its own user.
      calls.push(setLike(post.id, true));
    }
    const results = await Promise.all(calls);
    expect(results.every((result) => result.ok)).toBe(true);
    const [row] = await testDb().select().from(posts).where(eq(posts.id, post.id));
    expect(row.likeCount).toBe(8);
  });
});
