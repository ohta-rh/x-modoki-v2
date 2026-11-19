import { testDb, setupTestDb } from '@test/db';
import { workerDatabaseName, withDatabase } from '@test/db-names';
import { count, eq, sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { verifyPassword } from 'better-auth/crypto';
import { account, follows, likes, posts, user } from '../src/shared/db/schema/index.ts';
import { SEED_PASSWORD, seed } from './seed.ts';

setupTestDb();

const total = async (table: typeof user | typeof posts | typeof follows | typeof likes) =>
  (await testDb().select({ n: count() }).from(table))[0].n;

describe('seed', () => {
  it('架空の 20 人・300 件の投稿・フォロー・いいねを入れる', async () => {
    await seed(testDb(), vi.fn());
    expect(await total(user)).toBe(20);
    expect(await total(posts)).toBe(300);
    expect(await total(follows)).toBe(100);
    expect(await total(likes)).toBeGreaterThan(0);
  });

  it('実在の人に見える名前を使わない（sample と番号だけ、メールは example.test）', async () => {
    await seed(testDb(), vi.fn());
    const rows = await testDb().select().from(user);
    for (const row of rows) {
      expect(row.username).toMatch(/^sample\d{2}$/);
      expect(row.name).toMatch(/^サンプル \d{2}$/);
      expect(row.email).toMatch(/^sample\d{2}@example\.test$/);
    }
  });

  it('どの人も、公開した開発用のパスワードでログインできる（Better Auth の credential のアカウント、#35）', async () => {
    await seed(testDb(), vi.fn());
    const rows = await testDb().select().from(account);
    expect(rows).toHaveLength(20);
    const [sample01] = await testDb().select().from(user).where(eq(user.username, 'sample01'));
    const own = rows.find((row) => row.userId === sample01.id)!;
    expect(own).toMatchObject({ providerId: 'credential', accountId: sample01.id });
    expect(await verifyPassword({ hash: own.password!, password: SEED_PASSWORD })).toBe(true);
    expect(await verifyPassword({ hash: own.password!, password: 'wrong-password' })).toBe(false);
  });

  it('数の列が、実際の行の数と合う', async () => {
    await seed(testDb(), vi.fn());
    const { rows } = await testDb().execute<{ wrong: number }>(sql`
      SELECT
        (SELECT count(*) FROM posts p WHERE p.like_count <> (SELECT count(*) FROM likes l WHERE l.post_id = p.id))
        + (SELECT count(*) FROM users u WHERE u.posts_count <> (SELECT count(*) FROM posts p WHERE p.author_id = u.id))
        + (SELECT count(*) FROM users u WHERE u.followers_count <> (SELECT count(*) FROM follows f WHERE f.followee_id = u.id))
        + (SELECT count(*) FROM users u WHERE u.following_count <> (SELECT count(*) FROM follows f WHERE f.follower_id = u.id))
        AS wrong`);
    expect(Number(rows[0].wrong)).toBe(0);
  });

  it('投稿の ID は作った時刻の順に並ぶ', async () => {
    await seed(testDb(), vi.fn());
    const rows = await testDb().select({ id: posts.id, at: posts.createdAt }).from(posts);
    const byId = [...rows].sort((a, b) => (a.id < b.id ? -1 : 1)).map((row) => row.at.getTime());
    expect(byId).toEqual([...byId].sort((a, b) => a - b));
  });

  it('もう人がいれば、何も入れずにそう書く（開発用のデータを消さない）', async () => {
    const log = vi.fn();
    await seed(testDb(), vi.fn());
    await testDb().update(user).set({ bio: '手で書いた' }).where(eq(user.username, 'sample01'));
    await seed(testDb(), log);
    expect(log).toHaveBeenCalledWith('seed: the database already has users; nothing inserted');
    expect(await total(posts)).toBe(300);
    expect((await testDb().select().from(user).where(eq(user.username, 'sample01')))[0].bio).toBe(
      '手で書いた',
    );
  });

  it('入れた数を書く', async () => {
    const log = vi.fn();
    await seed(testDb(), log);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^seed: 20 users, 300 posts, 100 follows, \d+ likes$/),
    );
  });
});

describe('scripts/db-seed.ts', () => {
  it('コマンドとして動かすと、DATABASE_URL のデータベースに入れて 0 を設定する', async () => {
    const worker = workerDatabaseName(process.env.VITEST_POOL_ID ?? '1');
    vi.stubEnv('DATABASE_URL', withDatabase(process.env.DATABASE_URL!, worker));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await import('./db-seed.ts');
      await vi.waitFor(() => expect(process.exitCode).toBe(0));
      expect(await total(user)).toBe(20);
    } finally {
      process.exitCode = undefined;
    }
  });
});
