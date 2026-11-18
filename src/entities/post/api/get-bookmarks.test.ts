import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookmarks } from '@/shared/db';
import { getBookmarks } from './get-bookmarks';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const at = (n: number) => new Date(Date.UTC(2026, 10, 18, 0, 0, n));

describe('getBookmarks（#21）', () => {
  it('付けた順の新しい順に 20 件ずつ、カーソルで続きを返す。削除された投稿と他人のは出ない', async () => {
    const me = await makeUser();
    const other = await makeUser();
    const made = [];
    for (let i = 0; i < 22; i++) made.push(await makePost({ authorId: other.id, text: `p${i}` }));
    // Bookmarked in the reverse of the posts' order, so the list order is the bookmarks'.
    await testDb()
      .insert(bookmarks)
      .values(made.map((post, i) => ({ userId: me.id, postId: post.id, createdAt: at(100 - i) })));
    const gone = await makePost({ authorId: other.id, deletedAt: new Date() });
    await testDb()
      .insert(bookmarks)
      .values({ userId: me.id, postId: gone.id, createdAt: at(200) });
    await testDb().insert(bookmarks).values({ userId: other.id, postId: made[5].id });
    signInAs(me);

    const first = await getBookmarks(null);
    if (!first.ok) throw new Error('expected ok');
    expect(first.page.items.map((post) => post.text)).toEqual(made.slice(0, 20).map((p) => p.text));
    expect(first.page.items[0].viewer.bookmarked).toBe(true);
    expect(first.page.nextCursor).toMatch(/^\d+_\d+$/);
    const second = await getBookmarks(first.page.nextCursor);
    if (!second.ok) throw new Error('expected ok');
    expect(second.page.items.map((post) => post.text)).toEqual(['p20', 'p21']);
    expect(second.page.nextCursor).toBeNull();
  });

  it('同じ時刻に付けたものも、欠けず重ならずに続く', async () => {
    const me = await makeUser();
    const made = [];
    for (let i = 0; i < 21; i++) made.push(await makePost({ authorId: me.id }));
    await testDb()
      .insert(bookmarks)
      .values(made.map((post) => ({ userId: me.id, postId: post.id, createdAt: at(1) })));
    signInAs(me);
    const first = await getBookmarks(null);
    if (!first.ok) throw new Error('expected ok');
    const second = await getBookmarks(first.page.nextCursor);
    if (!second.ok) throw new Error('expected ok');
    const ids = [...first.page.items, ...second.page.items].map((post) => post.id);
    expect(new Set(ids).size).toBe(21);
  });

  it('ログイン無しは UNAUTHORIZED、形の違うカーソルは BAD_CURSOR', async () => {
    expect(await getBookmarks(null)).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    signInAs(await makeUser());
    expect(await getBookmarks('abc')).toEqual({ ok: false, error: 'BAD_CURSOR' });
    // 19 digits pass the shape but not bigint (#21 review 2).
    expect(await getBookmarks('9999999999999999999_1')).toEqual({ ok: false, error: 'BAD_CURSOR' });
    expect(await getBookmarks('1_9999999999999999999')).toEqual({ ok: false, error: 'BAD_CURSOR' });
  });
});
