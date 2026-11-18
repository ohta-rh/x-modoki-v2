import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookmarks } from '@/shared/db';
import { clearBookmarksAction, setBookmarkAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('setBookmarkAction・clearBookmarksAction（#21）', () => {
  it('ブックマークして数を返し、全て削除で消える', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await setBookmarkAction(post.id.toString(), true)).toEqual({ ok: true, count: 1 });
    expect(await clearBookmarksAction()).toEqual({ ok: true });
    expect(await testDb().select().from(bookmarks)).toHaveLength(0);
  });

  it('ログイン無しはログインするよう、無い・数字でない投稿は見つからないと言う', async () => {
    expect(await setBookmarkAction('1', true)).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'ログインしてください',
    });
    expect(await clearBookmarksAction()).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'ログインしてください',
    });
    signInAs(await makeUser());
    for (const id of ['999999999999999', 'abc']) {
      expect(await setBookmarkAction(id, true)).toEqual({
        ok: false,
        code: 'NOT_FOUND',
        message: 'この投稿は見つかりません',
      });
    }
  });
});
