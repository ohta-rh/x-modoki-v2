import { makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAccount } from './load-account';

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

describe('loadAccount（#29）', () => {
  it('自分のユーザー名・メールアドレス・登録した日（ISO）だけを返す', async () => {
    const me = await makeUser({ username: 'hanako', email: 'hanako@example.test' });
    signInAs(me);
    expect(await loadAccount()).toEqual({
      username: 'hanako',
      email: 'hanako@example.test',
      createdAt: me.createdAt.toISOString(),
    });
  });

  it('ログインしていなければログインへ', async () => {
    await expect(loadAccount()).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
  });
});
