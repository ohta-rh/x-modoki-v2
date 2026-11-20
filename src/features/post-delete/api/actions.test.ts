import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deletePostAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('deletePostAction', () => {
  it('自分の投稿を削除して ok', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await deletePostAction(post.id.toString())).toEqual({ ok: true });
  });

  it.each([
    ['他人の投稿', 'other', 'この投稿は削除できません'],
    ['数字でない ID', 'abc', 'この投稿は見つかりません'],
  ])('%s は文言で返す', async (_, kind, message) => {
    const owner = await makeUser();
    const post = await makePost({ authorId: owner.id });
    signInAs(await makeUser());
    expect(await deletePostAction(kind === 'other' ? post.id.toString() : kind)).toEqual({
      ok: false,
      message,
    });
  });

  // AUTHZ: deletePostAction UNAUTHORIZED
  it('ログインが無ければ、ログインを求める', async () => {
    expect(await deletePostAction('1')).toEqual({ ok: false, message: 'ログインしてください' });
  });
});
