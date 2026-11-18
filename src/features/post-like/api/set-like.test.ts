import { makePost, makeUser } from '@test/factories';
import { failingAtCommit, setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { likes, notifications, posts } from '@/shared/db';
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

  // FR-REACT-03: いいねの重複
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

describe('setLike の通知（#26）', () => {
  const notes = () =>
    testDb()
      .select({
        recipientId: notifications.recipientId,
        actorId: notifications.actorId,
        type: notifications.type,
        postId: notifications.postId,
      })
      .from(notifications);

  // FR-NOTIF-01: 元の操作と同じトランザクション
  it('いいねがコミットで失敗すると、通知も残らない（同じトランザクション、#30）', async () => {
    const author = await makeUser();
    const post = await makePost({ authorId: author.id });
    signInAs(await makeUser());
    await failingAtCommit('likes', () => expect(setLike(post.id, true)).rejects.toThrow());
    expect(await testDb().select().from(likes)).toEqual([]);
    expect(await notes()).toEqual([]);
  });

  it('いいねで作者へ通知を作り、外すと消す。繰り返しても 1 行。自分の投稿には作らない', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    const theirs = await makePost({ authorId: them.id });
    const mine = await makePost({ authorId: me.id });
    signInAs(me);
    await setLike(theirs.id, true);
    await setLike(theirs.id, true);
    await setLike(mine.id, true);
    expect(await notes()).toEqual([
      { recipientId: them.id, actorId: me.id, type: 'like', postId: theirs.id },
    ]);
    await setLike(theirs.id, false);
    expect(await notes()).toEqual([]);
  });
});
