import { makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProfileEdit } from './load-profile-edit';

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

describe('loadProfileEdit（#23）', () => {
  it('自分のユーザー名と、今のプロフィールの 4 つの値を返す', async () => {
    signInAs(
      await makeUser({ username: 'hanako', name: '花子', bio: '猫', website: 'https://x.test' }),
    );
    expect(await loadProfileEdit()).toEqual({
      username: 'hanako',
      initial: { name: '花子', bio: '猫', location: '', website: 'https://x.test' },
    });
  });

  it('入っていなければログインへ送る', async () => {
    await expect(loadProfileEdit()).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
  });
});
