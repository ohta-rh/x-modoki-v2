import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTimeline } from '@/entities/post/index.server';
import { follows, notifications, user } from '@/shared/db';
import { setFollow } from './set-follow';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
// hitRateLimit counts in one-minute windows; pin the clock mid-minute (#46).
beforeEach(() => {
  signOut();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-18T12:00:10Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

const counts = async (id: string) => {
  const [row] = await testDb().select().from(user).where(eq(user.id, id));
  return [row.followersCount, row.followingCount];
};

describe('setFollow（#24）', () => {
  it('フォローの行と両方の数が同じトランザクションで変わる。2 回でも 1 回。解除で戻る（0 より小さくしない）', async () => {
    const me = await makeUser();
    const them = await makeUser({ username: 'them' });
    signInAs(me);
    const results = await Promise.all([setFollow('them', true), setFollow('them', true)]);
    expect(results).toContainEqual({ ok: true, following: true, followersCount: 1 });
    expect(await testDb().select().from(follows)).toHaveLength(1);
    expect(await counts(them.id)).toEqual([1, 0]);
    expect(await counts(me.id)).toEqual([0, 1]);
    expect(await setFollow('them', false)).toEqual({
      ok: true,
      following: false,
      followersCount: 0,
    });
    expect(await setFollow('them', false)).toEqual({
      ok: true,
      following: false,
      followersCount: 0,
    });
    expect(await counts(them.id)).toEqual([0, 0]);
    expect(await counts(me.id)).toEqual([0, 0]);
  });

  it('お互いを同時にフォローしても行き詰まらない', async () => {
    const a = await makeUser({ username: 'aa' });
    const b = await makeUser({ username: 'bb' });
    const calls = [];
    for (let i = 0; i < 4; i++) {
      signInAs(a);
      calls.push(setFollow('bb', i % 2 === 0));
      signInAs(b);
      calls.push(setFollow('aa', i % 2 === 0));
    }
    expect((await Promise.all(calls)).every((result) => result.ok)).toBe(true);
  });

  it('フォローすると相手の返信でない投稿が「フォロー中」に出て、解除すると出なくなる', async () => {
    const me = await makeUser();
    const them = await makeUser({ username: 'them' });
    await makePost({ authorId: them.id, text: '相手の投稿' });
    signInAs(me);
    const texts = async () => {
      const result = await getTimeline('following', null);
      return result.ok ? result.page.items.map((item) => item.text) : [];
    };
    expect(await texts()).toEqual([]);
    await setFollow('them', true);
    expect(await texts()).toEqual(['相手の投稿']);
    await setFollow('them', false);
    expect(await texts()).toEqual([]);
  });

  it('自分は FORBIDDEN、無い人は NOT_FOUND、ログイン無しは UNAUTHORIZED、1 分に 31 回目は RATE_LIMITED', async () => {
    const me = await makeUser({ username: 'me' });
    await makeUser({ username: 'them' });
    expect(await setFollow('them', true)).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    signInAs(me);
    expect(await setFollow('me', true)).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(await setFollow('nobody', true)).toEqual({ ok: false, error: 'NOT_FOUND' });
    for (let i = 0; i < 27; i++) await setFollow('them', i % 2 === 0);
    expect(await setFollow('them', true)).toMatchObject({ ok: true });
    expect(await setFollow('them', false)).toEqual({ ok: false, error: 'RATE_LIMITED' });
  });
});

describe('setFollow の通知（#26）', () => {
  it('フォローで相手へ通知を作り（投稿は無し）、外すと消す。繰り返しても 1 行', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    signInAs(me);
    await setFollow(them.username!, true);
    await setFollow(them.username!, true);
    const notes = () =>
      testDb()
        .select({
          recipientId: notifications.recipientId,
          actorId: notifications.actorId,
          type: notifications.type,
          postId: notifications.postId,
        })
        .from(notifications);
    expect(await notes()).toEqual([
      { recipientId: them.id, actorId: me.id, type: 'follow', postId: null },
    ]);
    await setFollow(them.username!, false);
    expect(await notes()).toEqual([]);
  });
});
