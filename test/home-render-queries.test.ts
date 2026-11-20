import { countQueries, setupTestDb, testDb } from '@test/db';
import { makeFollow, makePost, makeUser } from '@test/factories';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadHomePage } from '@/_pages/home/index.server';
import { loadSidebar, loadViewer } from '@/_pages/main-layout/index.server';
import { getAuth } from '@/shared/auth/index.server';
import { user } from '@/shared/db';

const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => request.headers }));
vi.mock('next/server', () => ({ connection: async () => undefined }));
// React's cache() dedupes the session read per request in a real render, not in a test: do the
// same here, once per render, so the count matches what the page sends.
const session = vi.hoisted(() => ({ memo: null as Promise<unknown> | null }));
vi.mock('@/shared/auth/index.server', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/shared/auth/index.server')>();
  return { ...real, getSession: () => (session.memo ??= real.getSession()) };
});

setupTestDb();
beforeEach(() => {
  request.headers = new Headers();
});

/** Everything /home reads on its first render: the layout's loaders and the page's (#32). */
const renderHome = () => {
  session.memo = null;
  return Promise.all([loadViewer(), loadSidebar(), loadHomePage('following')]);
};

describe('/home の最初の描画（#32）', () => {
  // NFR-PERF-04: ホームの最初の描画の問い合わせ
  it('ログインした /home の最初の描画の問い合わせは、レイアウトの分を含めて 6 回以下で、投稿が 20 件でも 40 件でも同じ回数', async () => {
    const response = await getAuth().api.signUpEmail({
      body: {
        name: '数える人',
        email: 'counter@example.test',
        password: 'correct-horse-battery',
        username: 'counter',
        displayUsername: 'counter',
      },
      asResponse: true,
    });
    request.headers = new Headers({ cookie: response.headers.get('set-cookie')!.split(';')[0] });
    const [me] = await testDb()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, 'counter'));
    const friend = await makeUser();
    const stranger = await makeUser();
    await makeFollow(me.id, friend.id);
    const counts: number[] = [];
    let made = 0;
    for (const total of [20, 40]) {
      for (; made < total; made += 1) await makePost({ authorId: friend.id, text: `投稿 ${made}` });
      // The top of the page holds a repost and a quote, each of someone else's post (review 2).
      const original = await makePost({ authorId: stranger.id, text: `元 ${total}` });
      await makePost({ authorId: friend.id, text: '', repostOfId: original.id });
      await makePost({ authorId: friend.id, text: `引用 ${total}`, quoteOfId: original.id });
      counts.push(await countQueries(renderHome));
    }
    expect(counts[0]).toBeLessThanOrEqual(6);
    expect(counts[1]).toBe(counts[0]);
  });
});
