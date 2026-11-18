import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { follows } from '@/shared/db';
import { searchUsers } from './search-users';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const names = (result: Awaited<ReturnType<typeof searchUsers>>) => {
  if (!result.ok) throw new Error(result.error);
  return result.page.items.map((item) => item.username);
};

describe('searchUsers（#27）', () => {
  it('名前かユーザー名に含む人を、フォロワーの多い順に。大文字と小文字は区別しない。フォローしているかも付く', async () => {
    const me = await makeUser({ username: 'me_search' });
    const hana = await makeUser({ username: 'hanako_x', name: '花子', followersCount: 3 });
    await makeUser({ username: 'taro_x', name: 'はなこ好きの太郎', followersCount: 9 });
    await makeUser({ username: 'jiro_y', name: 'HANAKO FAN', followersCount: 1 });
    await makeUser({ username: 'other', name: '関係ない' });
    await testDb().insert(follows).values({ followerId: me.id, followeeId: hana.id });
    signInAs(me);
    expect(names(await searchUsers('hanako', null))).toEqual(['hanako_x', 'jiro_y']);
    expect(names(await searchUsers('はなこ', null))).toEqual(['taro_x']);
    const result = await searchUsers('HANAKO_X', null);
    if (!result.ok) throw new Error(result.error);
    expect(result.page.items[0]).toMatchObject({ name: '花子', isFollowing: true, isSelf: false });
  });

  it('20 人ずつ、カーソルで続きを返す。壊れたカーソルは BAD_CURSOR', async () => {
    for (let i = 0; i < 22; i += 1) {
      await makeUser({ username: `page_u${i}`, name: `ページ ${i}`, followersCount: i % 2 });
    }
    const first = await searchUsers('page_u', null);
    if (!first.ok) throw new Error(first.error);
    expect(first.page.items).toHaveLength(20);
    const second = await searchUsers('page_u', first.page.nextCursor);
    if (!second.ok) throw new Error(second.error);
    expect(second.page.nextCursor).toBeNull();
    const all = [...first.page.items, ...second.page.items].map((item) => item.username);
    expect(new Set(all).size).toBe(22);
    expect(await searchUsers('page', 'nope')).toEqual({ ok: false, error: 'BAD_CURSOR' });
  });

  it('本文とユーザーの検索の形は、gin_trgm_ops の索引を使える（EXPLAIN）', async () => {
    const plans = await testDb().transaction(async (tx) => {
      // Few rows make a full scan cheaper; turn it off to see whether the index can serve the shape.
      await tx.execute(sql`SET LOCAL enable_seqscan = off`);
      const plan = async (query: ReturnType<typeof sql>) =>
        (await tx.execute<{ 'QUERY PLAN': string }>(sql`EXPLAIN ${query}`)).rows
          .map((row) => row['QUERY PLAN'])
          .join('\n');
      return [
        await plan(sql`SELECT id FROM posts WHERE text ILIKE '%りんご%' ESCAPE '\\'`),
        await plan(
          sql`SELECT id FROM users WHERE (name || ' ' || coalesce(username, '')) ILIKE '%hanako%' ESCAPE '\\'`,
        ),
      ];
    });
    expect(plans[0]).toContain('posts_text_trgm_idx');
    expect(plans[1]).toContain('users_search_trgm_idx');
  });
});
