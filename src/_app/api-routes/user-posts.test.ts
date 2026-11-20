import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserPostList } from './user-posts';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const get = (username: string, query = '') =>
  getUserPostList(new Request(`http://localhost:3000/api/users/${username}/posts${query}`), {
    params: Promise.resolve({ username }),
  });

describe('GET /api/users/{username}/posts（#23）', () => {
  it('タブの投稿を items と nextCursor の JSON で返す。タブが無ければポスト、空のカーソルは最初', async () => {
    const me = await makeUser({ username: 'hanako' });
    await makePost({ authorId: me.id, text: '投稿' });
    for (const query of ['', '?tab=posts&cursor=']) {
      const response = await get('hanako', query);
      expect(response.status).toBe(200);
      expect((await response.json()).items.map((p: { text: string }) => p.text)).toEqual(['投稿']);
    }
  });

  it('無いユーザーは 404、他人のいいねは 403、知らないタブと形の違うカーソルは 400', async () => {
    await makeUser({ username: 'hanako' });
    signInAs(await makeUser());
    expect((await get('nobody')).status).toBe(404);
    expect((await get('hanako', '?tab=likes')).status).toBe(403);
    expect((await get('hanako', '?tab=photos')).status).toBe(400);
    expect((await get('hanako', '?cursor=x')).status).toBe(400);
  });
});
