import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { user } from '@/shared/db';
import { setPinAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('setPinAction（#23、#33）', () => {
  // AUTHZ: setPinAction UNAUTHORIZED
  it('ログインが無ければ、ログインを求める文言で、何も固定しない', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    expect(await setPinAction(post.id.toString(), true)).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'ログインしてください',
    });
    const [row] = await testDb().select().from(user).where(eq(user.id, me.id));
    expect(row.pinnedPostId).toBeNull();
  });

  it('自分の投稿を固定して ok。数字でない ID は見つからないと言う', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await setPinAction(post.id.toString(), true)).toEqual({ ok: true });
    expect(await setPinAction('abc', true)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
      message: 'この投稿は見つかりません',
    });
  });
});
