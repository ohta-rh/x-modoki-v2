import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { user } from '@/shared/db';
import { setDisplayAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));
const jar = { set: vi.fn() };
vi.mock('next/headers', () => ({ cookies: async () => jar }));

setupTestDb();
beforeEach(() => {
  signOut();
  jar.set.mockClear();
});

describe('setDisplayAction（#29）', () => {
  // FR-SET-02: 選択の保存
  // AUTHZ: updateDisplay SELF
  it('自分のテーマとアクセントの色を users に残し、cookie にも書く。ほかの人は変えない', async () => {
    const me = await makeUser();
    const other = await makeUser();
    signInAs(me);
    expect(await setDisplayAction({ theme: 'dim', accent: 'pink' })).toEqual({ ok: true });
    const [mine] = await testDb().select().from(user).where(eq(user.id, me.id));
    const [theirs] = await testDb().select().from(user).where(eq(user.id, other.id));
    expect([mine.theme, mine.accent]).toEqual(['dim', 'pink']);
    expect([theirs.theme, theirs.accent]).toEqual(['light', 'blue']);
    expect(jar.set).toHaveBeenCalledWith(expect.objectContaining({ name: 'theme', value: 'dim' }));
    expect(jar.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'accent', value: 'pink' }),
    );
  });

  // AUTHZ: setDisplayAction UNAUTHORIZED
  // AUTHZ: updateDisplay UNAUTHORIZED
  it('知らない値は VALIDATION、ログインが無ければ UNAUTHORIZED。どちらも何も書かない', async () => {
    signInAs(await makeUser());
    expect(await setDisplayAction({ theme: 'neon', accent: 'pink' })).toEqual({
      ok: false,
      error: 'VALIDATION',
    });
    signOut();
    expect(await setDisplayAction({ theme: 'dark', accent: 'green' })).toEqual({
      ok: false,
      error: 'UNAUTHORIZED',
    });
    expect(jar.set).not.toHaveBeenCalled();
  });
});
