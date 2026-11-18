import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

// Outside a React server render cache() keeps nothing, so give it the per-request memo it has there.
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: () => T) => {
    let value: { v: T } | undefined;
    return () => (value ??= { v: fn() }).v;
  },
}));

async function realGetDb() {
  vi.resetModules();
  return (await vi.importActual<typeof import('./client')>('./client')).getDb;
}

describe('getDb (ADR-0017, ADR-0037)', () => {
  it('DATABASE_URL の PostgreSQL に問い合わせられる', async () => {
    const getDb = await realGetDb();
    const { rows } = await getDb().execute<{ one: number }>(sql`SELECT 1 AS one`);
    expect(rows).toEqual([{ one: 1 }]);
  });

  it('同じリクエストの中では、同じ接続を返す', async () => {
    const getDb = await realGetDb();
    expect(getDb()).toBe(getDb());
  });

  it('使わなくなった接続は 1 秒ほどで閉じ、そのあとも使える（閉じた pool を使う誤りが起きない）', async () => {
    const getDb = await realGetDb();
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    expect(db.$client.totalCount).toBe(1);
    await vi.waitFor(() => expect(db.$client.totalCount).toBe(0), {
      timeout: 3_000,
      interval: 100,
    });
    const { rows } = await db.execute<{ one: number }>(sql`SELECT 1 AS one`);
    expect(rows).toEqual([{ one: 1 }]);
    expect(db.$client.ending).toBe(false);
  });
});
