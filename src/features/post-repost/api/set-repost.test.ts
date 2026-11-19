import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { and, eq, isNotNull } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { posts, notifications } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { setRepost } from './set-repost';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const row = async (id: bigint) => (await testDb().select().from(posts).where(eq(posts.id, id)))[0];
const repostRows = (authorId: string) =>
  testDb()
    .select()
    .from(posts)
    .where(and(eq(posts.authorId, authorId), isNotNull(posts.repostOfId)));

describe('setRepost（#22、ADR-0015）', () => {
  // FR-CONV-05: リポスト
  // FR-CONV-07: リポストの取り消し
  it('リポストは本文の空な posts の 1 行で、元の数を 1 増やす。2 回しても 1 行。取り消すと行が消え 1 減る', async () => {
    const author = await makeUser();
    const me = await makeUser();
    const post = await makePost({ authorId: author.id });
    signInAs(me);
    const results = await Promise.all([setRepost(post.id, true), setRepost(post.id, true)]);
    expect(results).toContainEqual({ ok: true, reposted: true, count: 1 });
    const rows = await repostRows(me.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      text: '',
      repostOfId: post.id,
      replyToId: null,
      quoteOfId: null,
    });
    expect((await row(post.id)).repostCount).toBe(1);
    expect(await setRepost(post.id, false)).toEqual({ ok: true, reposted: false, count: 0 });
    expect(await repostRows(me.id)).toHaveLength(0);
    expect(await setRepost(post.id, false)).toEqual({ ok: true, reposted: false, count: 0 });
  });

  it('リポストのリポストは元の投稿へのリポストになる。返信はその返信へのリポスト', async () => {
    const author = await makeUser();
    const other = await makeUser();
    const me = await makeUser();
    const post = await makePost({ authorId: author.id });
    const reply = await makePost({ authorId: author.id, replyToId: post.id, rootId: post.id });
    signInAs(other);
    await setRepost(post.id, true);
    const [othersRepost] = await repostRows(other.id);
    signInAs(me);
    expect(await setRepost(othersRepost.id, true)).toEqual({ ok: true, reposted: true, count: 2 });
    await setRepost(reply.id, true);
    const mine = (await repostRows(me.id)).map((r) => r.repostOfId).sort();
    expect(mine).toEqual([post.id, reply.id].sort());
    expect((await row(post.id)).repostCount).toBe(2);
    expect((await row(reply.id)).repostCount).toBe(1);
  });

  it('別の人が同時にリポストしても、行き詰まらず全員の分が数えられる', async () => {
    const post = await makePost({ authorId: (await makeUser()).id });
    const calls = [];
    for (let i = 0; i < 6; i++) {
      signInAs(await makeUser());
      calls.push(setRepost(post.id, true));
    }
    expect((await Promise.all(calls)).every((result) => result.ok)).toBe(true);
    expect((await row(post.id)).repostCount).toBe(6);
  });

  // AUTHZ: setRepost UNAUTHORIZED
  it('ログイン無しは UNAUTHORIZED、無い投稿と削除済みの投稿は NOT_FOUND', async () => {
    const me = await makeUser();
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    expect(await setRepost(gone.id, true)).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    signInAs(me);
    expect(await setRepost(gone.id, true)).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await setRepost(newId(), true)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('確かめたあと、書く前に元が消されたら、リポストせず NOT_FOUND', async () => {
    const post = await makePost({ authorId: (await makeUser()).id });
    const me = await makeUser();
    signInAs(me);
    const db = testDb();
    const transaction = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementationOnce(async (run) => {
      await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, post.id));
      return transaction(run);
    });
    expect(await setRepost(post.id, true)).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await repostRows(me.id)).toHaveLength(0);
  });
});

describe('setRepost の通知（#26）', () => {
  it('リポストで元の作者へ通知を作り、取り消すと消す。自分の投稿には作らない', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    const theirs = await makePost({ authorId: them.id });
    const mine = await makePost({ authorId: me.id });
    signInAs(me);
    await setRepost(theirs.id, true);
    await setRepost(mine.id, true);
    const notes = () =>
      testDb()
        .select({
          recipientId: notifications.recipientId,
          actorId: notifications.actorId,
          type: notifications.type,
          postId: notifications.postId,
        })
        .from(notifications);
    expect(await notes()).toEqual([
      { recipientId: them.id, actorId: me.id, type: 'repost', postId: theirs.id },
    ]);
    await setRepost(theirs.id, false);
    expect(await notes()).toEqual([]);
  });
});

describe('リポストするのは誰か（#33）', () => {
  // AUTHZ: setRepost SELF
  it('他人の投稿をリポストすると、リポストの行の作者はセッションの利用者。元の作者の分にはならない', async () => {
    const author = await makeUser();
    const me = await makeUser();
    const post = await makePost({ authorId: author.id });
    signInAs(me);
    await setRepost(post.id, true);
    const reposts = await testDb()
      .select({ authorId: posts.authorId })
      .from(posts)
      .where(isNotNull(posts.repostOfId));
    expect(reposts.map((row) => row.authorId)).toEqual([me.id]);
  });
});
