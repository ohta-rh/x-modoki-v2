import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPostReplies } from './replies';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const get = (id: string, query = '') =>
  getPostReplies(new Request(`http://localhost:3000/api/posts/${id}/replies${query}`), {
    params: Promise.resolve({ id }),
  });

describe('GET /api/posts/{id}/replies', () => {
  it('返信を古い順に、items と nextCursor の JSON で返す（ログインは要らない）', async () => {
    const me = await makeUser();
    const parent = await makePost({ authorId: me.id });
    await makePost({ authorId: me.id, replyToId: parent.id, rootId: parent.id, text: '返信' });
    const response = await get(parent.id.toString(), '?cursor=');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items.map((post: { text: string }) => post.text)).toEqual(['返信']);
    expect(body.nextCursor).toBeNull();
  });

  it('数字でない ID は 404、不正なカーソルは 400', async () => {
    expect((await get('abc')).status).toBe(404);
    expect((await get('1', '?cursor=x')).status).toBe(400);
  });
});
