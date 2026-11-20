import { makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserProfile } from './user-profile';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const get = (username: string) =>
  getUserProfile(new Request(`http://localhost:3000/api/users/${username}`), {
    params: Promise.resolve({ username }),
  });

describe('GET /api/users/{username}（#23: ホバーのカード）', () => {
  it('プロフィールを JSON で返す（ログインは要らない）。無いユーザーは 404', async () => {
    await makeUser({ username: 'hanako', name: '花子', email: 'secret@example.test' });
    const response = await get('hanako');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ username: 'hanako', name: '花子' });
    expect(JSON.stringify(body)).not.toContain('secret@example.test');
    expect((await get('nobody')).status).toBe(404);
  });
});
