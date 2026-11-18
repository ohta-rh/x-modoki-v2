import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { user } from '@/shared/db';
import { updateProfileAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const input = { name: '新しい名前', bio: '猫', location: '東京', website: 'https://example.com' };

describe('updateProfileAction（#23）', () => {
  it('自分のプロフィールの 4 つの項目だけを変える', async () => {
    const me = await makeUser({ username: 'hanako' });
    const other = await makeUser();
    signInAs(me);
    expect(await updateProfileAction({ ...input, username: 'stolen' } as typeof input)).toEqual({
      ok: true,
    });
    const [row] = await testDb().select().from(user).where(eq(user.id, me.id));
    expect(row).toMatchObject({ ...input, username: 'hanako' });
    const [untouched] = await testDb().select().from(user).where(eq(user.id, other.id));
    expect(untouched.bio).toBe('');
  });

  it('形の違う入力は項目ごとの文言、ログイン無しはログインするよう言う', async () => {
    signInAs(await makeUser());
    expect(await updateProfileAction({ ...input, website: 'ftp://x' })).toEqual({
      ok: false,
      code: 'VALIDATION',
      fieldErrors: { website: ['http か https の URL を入れてください'] },
    });
    signOut();
    expect(await updateProfileAction(input)).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      fieldErrors: {},
      message: 'ログインしてください',
    });
  });
});
