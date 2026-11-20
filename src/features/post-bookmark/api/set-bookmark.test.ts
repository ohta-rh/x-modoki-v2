import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookmarks, posts } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { clearBookmarks, setBookmark } from './set-bookmark';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const count = async (id: bigint) =>
  (await testDb().select().from(posts).where(eq(posts.id, id)))[0].bookmarkCount;

describe('setBookmark（#21）', () => {
  it('ブックマークすると 1 行入り数が 1 増え、同時に何回押しても 1 回、外すと戻る', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    const results = await Promise.all([setBookmark(post.id, true), setBookmark(post.id, true)]);
    expect(results).toContainEqual({ ok: true, bookmarked: true, count: 1 });
    expect(await count(post.id)).toBe(1);
    expect(await setBookmark(post.id, false)).toEqual({ ok: true, bookmarked: false, count: 0 });
    expect(await setBookmark(post.id, false)).toEqual({ ok: true, bookmarked: false, count: 0 });
    expect(await testDb().select().from(bookmarks)).toHaveLength(0);
  });

  // AUTHZ: setBookmark UNAUTHORIZED
  it('ログイン無しは UNAUTHORIZED、無い投稿と削除済みの投稿は NOT_FOUND', async () => {
    const me = await makeUser();
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    expect(await setBookmark(gone.id, true)).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    signInAs(me);
    expect(await setBookmark(gone.id, true)).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await setBookmark(newId(), true)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('clearBookmarks（#21: 全て削除）', () => {
  // AUTHZ: clearBookmarks SELF
  it('自分のブックマークだけを全て消し、それぞれの数を 1 減らす（0 より小さくしない）', async () => {
    const me = await makeUser();
    const other = await makeUser();
    const a = await makePost({ authorId: other.id });
    const b = await makePost({ authorId: other.id });
    signInAs(other);
    await setBookmark(a.id, true);
    signInAs(me);
    await setBookmark(a.id, true);
    await setBookmark(b.id, true);
    await testDb().update(posts).set({ bookmarkCount: 0 }).where(eq(posts.id, b.id));
    expect(await clearBookmarks()).toEqual({ ok: true });
    expect(await count(a.id)).toBe(1);
    expect(await count(b.id)).toBe(0);
    const left = await testDb().select().from(bookmarks);
    expect(left.map((row) => row.userId)).toEqual([other.id]);
  });

  // AUTHZ: clearBookmarks UNAUTHORIZED
  it('ログイン無しは UNAUTHORIZED。何も無くても ok', async () => {
    expect(await clearBookmarks()).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    signInAs(await makeUser());
    expect(await clearBookmarks()).toEqual({ ok: true });
  });
});

describe('setBookmark の同時の操作（#21 のレビュー）', () => {
  it('別の人が同じ投稿に同時に押しても、行き詰まらず、全員の分が数えられる', async () => {
    const author = await makeUser();
    const post = await makePost({ authorId: author.id });
    const calls = [];
    for (let i = 0; i < 8; i++) {
      signInAs(await makeUser());
      // getSession is read when the call starts, so each call is its own user.
      calls.push(setBookmark(post.id, true));
    }
    const results = await Promise.all(calls);
    expect(results.every((result) => result.ok)).toBe(true);
    const [row] = await testDb().select().from(posts).where(eq(posts.id, post.id));
    expect(row.bookmarkCount).toBe(8);
  });
});

describe('ブックマークするのは誰か（#33）', () => {
  // AUTHZ: setBookmark SELF
  it('他人の投稿をブックマークすると、行はセッションの利用者のもの。作者の分にはならない', async () => {
    const author = await makeUser();
    const me = await makeUser();
    const post = await makePost({ authorId: author.id });
    signInAs(me);
    await setBookmark(post.id, true);
    expect(
      (await testDb().select({ userId: bookmarks.userId }).from(bookmarks)).map(
        (row) => row.userId,
      ),
    ).toEqual([me.id]);
  });
});
