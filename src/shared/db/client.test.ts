import { sql } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

// after() needs a Next.js request scope; capture the callback instead (the only Next.js seam).
const afterCallbacks: Array<() => unknown> = [];
vi.mock('next/server', () => ({
  after: (callback: () => unknown) => afterCallbacks.push(callback),
}));
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

afterEach(async () => {
  for (const callback of afterCallbacks.splice(0)) await callback();
});

describe('getDb (ADR-0017)', () => {
  it('DATABASE_URL の PostgreSQL に問い合わせられる', async () => {
    const getDb = await realGetDb();
    const { rows } = await getDb().execute<{ one: number }>(sql`SELECT 1 AS one`);
    expect(rows).toEqual([{ one: 1 }]);
  });

  it('同じリクエストの中では、同じ接続を返す', async () => {
    const getDb = await realGetDb();
    expect(getDb()).toBe(getDb());
    expect(afterCallbacks).toHaveLength(1);
  });

  it('応答のあとで接続を閉じる', async () => {
    const getDb = await realGetDb();
    const db = getDb();
    await afterCallbacks.splice(0)[0]();
    await expect(db.execute(sql`SELECT 1`)).rejects.toMatchObject({
      cause: { message: expect.stringMatching(/after calling end/) },
    });
  });

  it('読み込んだだけでは接続を作らない', async () => {
    await realGetDb();
    expect(afterCallbacks).toHaveLength(0);
  });
});
