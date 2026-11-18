import { makeFollow, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserFollows } from './user-follows';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const get = (username: string, query = '') =>
  getUserFollows(new Request(`http://localhost:3000/api/users/${username}/follows${query}`), {
    params: Promise.resolve({ username }),
  });

describe('GET /api/users/{username}/follows（#24）', () => {
  it('type のとおりの一覧を JSON で返す。空のカーソルは最初', async () => {
    const hana = await makeUser({ username: 'hana' });
    const fan = await makeUser({ username: 'fan' });
    await makeFollow(fan.id, hana.id);
    const response = await get('hana', '?type=followers&cursor=');
    expect(response.status).toBe(200);
    expect((await response.json()).items.map((u: { username: string }) => u.username)).toEqual([
      'fan',
    ]);
    expect((await (await get('hana', '?type=following')).json()).items).toEqual([]);
  });

  it('無いユーザーは 404、知らない type と形の違うカーソルは 400', async () => {
    await makeUser({ username: 'hana' });
    expect((await get('nobody', '?type=followers')).status).toBe(404);
    expect((await get('hana', '?type=friends')).status).toBe(400);
    expect((await get('hana', '?type=followers&cursor=x')).status).toBe(400);
  });
});
