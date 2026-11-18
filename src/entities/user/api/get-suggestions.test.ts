import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { follows } from '@/shared/db';
import { getSuggestions } from './get-suggestions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('getSuggestions（#27）', () => {
  it('自分と、フォローしている人を除いて、フォロワーの多い順に 3 人', async () => {
    const me = await makeUser({ username: 'me_sg', followersCount: 100 });
    const followed = await makeUser({ username: 'followed_sg', followersCount: 50 });
    for (const [username, followersCount] of [
      ['a_sg', 40],
      ['b_sg', 30],
      ['c_sg', 20],
      ['d_sg', 10],
    ] as const) {
      await makeUser({ username, followersCount });
    }
    await testDb().insert(follows).values({ followerId: me.id, followeeId: followed.id });
    signInAs(me);
    const suggested = await getSuggestions();
    expect(suggested.map((person) => person.username)).toEqual(['a_sg', 'b_sg', 'c_sg']);
    expect(suggested[0]).toMatchObject({ isFollowing: false, isSelf: false, bio: '' });
  });

  it('ログインしていなければ、全体の上位 3 人', async () => {
    for (const [username, followersCount] of [
      ['x_sg', 3],
      ['y_sg', 2],
      ['z_sg', 1],
      ['w_sg', 0],
    ] as const) {
      await makeUser({ username, followersCount });
    }
    expect((await getSuggestions()).map((person) => person.username)).toEqual([
      'x_sg',
      'y_sg',
      'z_sg',
    ]);
  });

  it('上位のほとんどをフォローしていても、まだフォローしていない人を 3 人出す（レビュー 1）', async () => {
    const me = await makeUser({ username: 'me_many' });
    const top = [];
    for (let i = 0; i < 20; i += 1) {
      top.push(await makeUser({ username: `top_${i}`, followersCount: 100 + i }));
    }
    for (const person of top.slice(0, 18)) {
      await testDb().insert(follows).values({ followerId: me.id, followeeId: person.id });
    }
    for (let i = 0; i < 3; i += 1) await makeUser({ username: `low_${i}`, followersCount: 10 - i });
    signInAs(me);
    expect((await getSuggestions()).map((person) => person.username)).toEqual([
      'top_19',
      'top_18',
      'low_0',
    ]);
  });
});
