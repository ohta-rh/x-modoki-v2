import { makeFollow, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { follows } from '@/shared/db';
import { getFollows } from './get-follows';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const at = (n: number) => new Date(Date.UTC(2026, 10, 18, 0, 0, n));

describe('getFollows（#24）', () => {
  // FR-PROF-08: フォロー中とフォロワーの一覧
  it('フォロー中とフォロワーを、フォローした順の新しい順に、見ている人がフォローしているか付きで返す', async () => {
    const hana = await makeUser({ username: 'hana', name: '花', bio: '猫' });
    const a = await makeUser({ username: 'aa', name: 'A' });
    const b = await makeUser({ username: 'bb', name: 'B' });
    const me = await makeUser({ username: 'me' });
    await makeFollow(hana.id, a.id);
    await makeFollow(hana.id, b.id);
    await makeFollow(a.id, hana.id);
    await makeFollow(me.id, b.id);
    await testDb()
      .update(follows)
      .set({ createdAt: at(1) })
      .where(and(eq(follows.followerId, hana.id), eq(follows.followeeId, a.id)));
    await testDb()
      .update(follows)
      .set({ createdAt: at(2) })
      .where(and(eq(follows.followerId, hana.id), eq(follows.followeeId, b.id)));
    signInAs(me);
    const following = await getFollows('hana', 'following', null);
    if (!following.ok) throw new Error();
    expect(following.page.items).toEqual([
      { username: 'bb', name: 'B', avatarUrl: null, bio: '', isFollowing: true, isSelf: false },
      { username: 'aa', name: 'A', avatarUrl: null, bio: '', isFollowing: false, isSelf: false },
    ]);
    const followers = await getFollows('hana', 'followers', null);
    if (!followers.ok) throw new Error();
    expect(followers.page.items.map((item) => item.username)).toEqual(['aa']);
  });

  it('20 件ずつカーソルで続く。無いユーザーは NOT_FOUND、形の違うカーソルは BAD_CURSOR。ログインは要らない', async () => {
    const hana = await makeUser({ username: 'hana' });
    for (let i = 0; i < 21; i++) {
      const fan = await makeUser();
      await makeFollow(fan.id, hana.id);
      await testDb()
        .update(follows)
        .set({ createdAt: at(1) })
        .where(eq(follows.followerId, fan.id));
    }
    const first = await getFollows('hana', 'followers', null);
    if (!first.ok) throw new Error();
    expect(first.page.items).toHaveLength(20);
    const second = await getFollows('hana', 'followers', first.page.nextCursor);
    if (!second.ok) throw new Error();
    expect(second.page.items).toHaveLength(1);
    expect(second.page.nextCursor).toBeNull();
    const all = new Set([...first.page.items, ...second.page.items].map((item) => item.username));
    expect(all.size).toBe(21);
    expect(await getFollows('nobody', 'followers', null)).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(await getFollows('hana', 'followers', 'abc')).toEqual({
      ok: false,
      error: 'BAD_CURSOR',
    });
  });
});
