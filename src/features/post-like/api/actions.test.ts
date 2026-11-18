import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setLikeAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('setLikeAction（#21）', () => {
  it('いいねして、その後の数を返す', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await setLikeAction(post.id.toString(), true)).toEqual({ ok: true, count: 1 });
    expect(await setLikeAction(post.id.toString(), false)).toEqual({ ok: true, count: 0 });
  });

  it('ログイン無しはログインするよう、無い・数字でない・削除済みの投稿は見つからないと言う', async () => {
    const me = await makeUser();
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    expect(await setLikeAction(gone.id.toString(), true)).toEqual({
      ok: false,
      message: 'ログインしてください',
    });
    signInAs(me);
    for (const id of [gone.id.toString(), 'abc']) {
      expect(await setLikeAction(id, true)).toEqual({
        ok: false,
        message: 'この投稿は見つかりません',
      });
    }
  });
});
