import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { user } from '@/shared/db';
import { loadDisplay } from './load-display';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

setupTestDb();
beforeEach(signOut);

describe('loadDisplay（#29）', () => {
  it('自分のテーマとアクセントの色を返す', async () => {
    const me = await makeUser();
    await testDb().update(user).set({ theme: 'dark', accent: 'green' }).where(eq(user.id, me.id));
    signInAs(me);
    expect(await loadDisplay()).toEqual({ theme: 'dark', accent: 'green' });
  });

  it('ログインしていなければログインへ', async () => {
    await expect(loadDisplay()).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
  });
});
