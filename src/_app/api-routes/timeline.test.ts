import { makeFollow, makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newId } from '@/shared/lib/id';
import { getFollowingNewCount, getFollowingTimeline, getForYouTimeline } from './timeline';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const get = (handler: typeof getFollowingTimeline, query = '') =>
  handler(new Request(`http://localhost:3000/api/timeline/x${query}`));

describe('GET /api/timeline/following と /for-you（application-structure.md の 5 節）', () => {
  it('ログインが無ければ 401', async () => {
    const response = await get(getFollowingTimeline);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' });
  });

  it('items と nextCursor の JSON を返し、ID は文字列', async () => {
    const me = await makeUser();
    const id = newId();
    await makePost({ id, authorId: me.id, text: 'こんにちは' });
    signInAs(me);
    for (const handler of [getFollowingTimeline, getForYouTimeline]) {
      const response = await get(handler);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nextCursor).toBeNull();
      expect(body.items).toHaveLength(1);
      expect(body.items[0]).toMatchObject({ id: id.toString(), text: 'こんにちは' });
    }
  });

  it('カーソルの次から返す', async () => {
    const me = await makeUser();
    const older = newId({ now: Date.UTC(2026, 10, 1), random: 0 });
    const newer = newId({ now: Date.UTC(2026, 10, 2), random: 0 });
    await makePost({ id: older, authorId: me.id, text: '古い' });
    await makePost({ id: newer, authorId: me.id, text: '新しい' });
    signInAs(me);
    const body = await (await get(getFollowingTimeline, `?cursor=${newer}`)).json();
    expect(body.items.map((post: { text: string }) => post.text)).toEqual(['古い']);
  });

  it('空のカーソル（cursor=）は、カーソル無しとして 1 ページ目を返す', async () => {
    const me = await makeUser();
    await makePost({ authorId: me.id, text: '最初' });
    signInAs(me);
    const response = await get(getFollowingTimeline, '?cursor=');
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(1);
  });

  it.each(['abc', '-1', '99999999999999999999'])('数字でないカーソル %s は 400', async (cursor) => {
    signInAs(await makeUser());
    const response = await get(getForYouTimeline, `?cursor=${cursor}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'VALIDATION' });
  });
});

describe('GET /api/timeline/following/new-count?since=（#28）', () => {
  const count = (query: string) =>
    getFollowingNewCount(
      new Request(`http://localhost:3000/api/timeline/following/new-count${query}`),
    );

  it('since より新しい、フォローしている人の投稿の数を返す', async () => {
    const me = await makeUser();
    const friend = await makeUser();
    await makeFollow(me.id, friend.id);
    const since = newId({ now: Date.UTC(2026, 10, 19), random: 0 });
    await makePost({
      id: newId({ now: Date.UTC(2026, 10, 19, 1), random: 0 }),
      authorId: friend.id,
    });
    signInAs(me);
    const response = await count(`?since=${since}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
  });

  it('since が無いか ID でなければ 400、ログインが無ければ 401', async () => {
    signInAs(await makeUser());
    expect((await count('')).status).toBe(400);
    expect((await count('?since=abc')).status).toBe(400);
    signOut();
    const response = await count('?since=1');
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' });
  });
});
