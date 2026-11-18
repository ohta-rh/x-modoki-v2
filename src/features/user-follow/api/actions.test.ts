import { makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setFollowAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('setFollowAction（#24）', () => {
  it('フォローして相手のフォロワーの数を返す。失敗はコードと文言', async () => {
    const me = await makeUser({ username: 'me' });
    await makeUser({ username: 'them' });
    expect(await setFollowAction('them', true)).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'ログインしてください',
    });
    signInAs(me);
    expect(await setFollowAction('them', true)).toEqual({ ok: true, followersCount: 1 });
    expect(await setFollowAction('me', true)).toEqual({
      ok: false,
      code: 'FORBIDDEN',
      message: '自分はフォローできません',
    });
    expect(await setFollowAction('nobody', true)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
      message: 'このアカウントは存在しません',
    });
    expect(await setFollowAction(42 as unknown as string, true)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
      message: 'このアカウントは存在しません',
    });
  });
});
