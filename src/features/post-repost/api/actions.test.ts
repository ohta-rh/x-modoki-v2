import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setRepostAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('setRepostAction（#22）', () => {
  it('リポストして、その後の数を返す。取り消すと戻る', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: (await makeUser()).id });
    signInAs(me);
    expect(await setRepostAction(post.id.toString(), true)).toEqual({ ok: true, count: 1 });
    expect(await setRepostAction(post.id.toString(), false)).toEqual({ ok: true, count: 0 });
  });

  // AUTHZ: setRepostAction UNAUTHORIZED
  it('ログイン無し・無い投稿・数字でない ID は、コードと文言を返す', async () => {
    expect(await setRepostAction('1', true)).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'ログインしてください',
    });
    signInAs(await makeUser());
    for (const id of ['999999999999999', 'abc']) {
      expect(await setRepostAction(id, true)).toEqual({
        ok: false,
        code: 'NOT_FOUND',
        message: 'この投稿は見つかりません',
      });
    }
  });
});
