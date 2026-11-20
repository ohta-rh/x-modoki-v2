import { makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCompose } from './load-compose';

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

describe('loadCompose（#28）', () => {
  it('自分のユーザー名を返す（トーストの「表示」のリンクに使う）', async () => {
    signInAs(await makeUser({ username: 'hanako' }));
    expect(await loadCompose()).toEqual({ username: 'hanako' });
  });

  it('ログインしていなければログインへ送る', async () => {
    await expect(loadCompose()).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
  });
});
