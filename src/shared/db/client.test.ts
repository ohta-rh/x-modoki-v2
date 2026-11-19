import { createServer, type Socket } from 'node:net';
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

  it('使わなくなった接続はすぐに閉じ、そのあとも使える（閉じた pool を使う誤りが起きない）', async () => {
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

  it('問い合わせのあと 300ms で、使っていない接続を閉じる（1 秒持つと、要求が多いとき接続が上限に達する: #59）', async () => {
    const getDb = await realGetDb();
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(db.$client.totalCount).toBe(0);
  });
});

describe('newPool の、つなぐ時間の上限（#55、ADR-0057）', () => {
  it('つながらないまま黙る相手には、待ち続けずに 1 回だけつなぎ直し、それでも駄目ならエラーにする', async () => {
    // Accepts the TCP connection and never answers: a connect that stalls past the socket.
    const sockets: Socket[] = [];
    const silent = createServer((socket) => sockets.push(socket));
    await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve));
    const { port } = silent.address() as { port: number };
    try {
      const { newPool } = await vi.importActual<typeof import('./client')>('./client');
      const pool = newPool(`postgres://u:p@127.0.0.1:${port}/db`);
      const start = Date.now();
      await expect(pool.query('SELECT 1')).rejects.toThrow(/timeout/i);
      const took = Date.now() - start;
      expect(took).toBeGreaterThanOrEqual(2_800);
      expect(took).toBeLessThan(6_000);
      expect(sockets).toHaveLength(2);
      await pool.end();
    } finally {
      for (const socket of sockets) socket.destroy();
      silent.close();
    }
  }, 15_000);

  it('トランザクションが使う connect() でも、1 回だけつなぎ直してからエラーにする', async () => {
    const sockets: Socket[] = [];
    const silent = createServer((socket) => sockets.push(socket));
    await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve));
    const { port } = silent.address() as { port: number };
    try {
      const { newPool } = await vi.importActual<typeof import('./client')>('./client');
      const pool = newPool(`postgres://u:p@127.0.0.1:${port}/db`);
      await expect(pool.connect()).rejects.toThrow(/timeout/i);
      expect(sockets).toHaveLength(2);
      await pool.end();
    } finally {
      for (const socket of sockets) socket.destroy();
      silent.close();
    }
  }, 15_000);

  it('時間切れでないエラー（つないですぐ切られる）は、つなぎ直さずにそのまま返す', async () => {
    const sockets: Socket[] = [];
    const rude = createServer((socket) => {
      sockets.push(socket);
      socket.destroy();
    });
    await new Promise<void>((resolve) => rude.listen(0, '127.0.0.1', resolve));
    const { port } = rude.address() as { port: number };
    try {
      const { newPool } = await vi.importActual<typeof import('./client')>('./client');
      const pool = newPool(`postgres://u:p@127.0.0.1:${port}/db`);
      await expect(pool.query('SELECT 1')).rejects.toThrow(/terminated|ECONNRESET/i);
      await expect(pool.connect()).rejects.toThrow(/terminated|ECONNRESET/i);
      expect(sockets).toHaveLength(2);
      await pool.end();
    } finally {
      rude.close();
    }
  });
});
