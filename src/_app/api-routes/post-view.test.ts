import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession } from '@test/session';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPostDetail } from '@/entities/post/index.server';
import { postView } from './post-view';

// after() runs its callback once the response is sent; the test runs it when it chooses.
const pending: Array<() => Promise<unknown>> = [];
vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));
vi.mock('next/server', () => ({
  after: (task: () => Promise<unknown>) => pending.push(task),
  connection: async () => undefined,
}));

setupTestDb();
afterEach(() => {
  pending.length = 0;
});

const post = (id: string) =>
  postView(new Request(`http://localhost:3000/api/posts/${id}/view`, { method: 'POST' }), {
    params: Promise.resolve({ id }),
  });
const views = async (id: bigint) => {
  const result = await getPostDetail(id);
  if (!result.ok) throw new Error('expected the post');
  return result.detail.post.counts.views;
};

describe('POST /api/posts/{id}/view（#21、ADR-0011）', () => {
  it('先に 204 を返し、応答のあとで表示の回数を 1 足す', async () => {
    const target = await makePost({ authorId: (await makeUser()).id });
    const response = await post(target.id.toString());
    expect(response.status).toBe(204);
    expect(await views(target.id)).toBe(0);
    await Promise.all(pending.map((task) => task()));
    expect(await views(target.id)).toBe(1);
  });

  it('あとの書き込みが失敗しても、投げずに終わる（画面に影響しない）', async () => {
    const target = await makePost({ authorId: (await makeUser()).id });
    await post(target.id.toString());
    vi.spyOn(testDb(), 'update').mockImplementationOnce(() => {
      throw new Error('database down');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(Promise.all(pending.map((task) => task()))).resolves.toBeDefined();
    expect(log).toHaveBeenCalled();
  });

  it('数字でない ID は 404 で、何も足さない', async () => {
    expect((await post('abc')).status).toBe(404);
    expect(pending).toHaveLength(0);
  });
});
