// Direct database access for e2e fixtures that the UI cannot make quickly (e.g. 60 posts would hit
// the 10-per-minute post limit). It writes to the same database `pnpm start` uses (.env.local).
import { existsSync } from 'node:fs';
import pg from 'pg';

if (!process.env.DATABASE_URL && existsSync('.env.local')) process.loadEnvFile('.env.local');

const EPOCH = Date.UTC(2026, 0, 1);

/** Inserts `count` plain posts by `username`, one second apart, oldest first. */
export async function insertPosts(
  username: string,
  count: number,
  prefix = 'e2e の投稿',
): Promise<void> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE username = $1',
      [username],
    );
    const start = Date.now() - count * 1000;
    for (let i = 0; i < count; i += 1) {
      const at = start + i * 1000;
      const id = (BigInt(at - EPOCH) << 22n) | BigInt(Math.floor(Math.random() * 0x3fffff));
      await client.query(
        'INSERT INTO posts (id, author_id, text, created_at) VALUES ($1, $2, $3, $4)',
        [id.toString(), rows[0].id, `${prefix} ${i + 1}`, new Date(at)],
      );
    }
    await client.query('UPDATE users SET posts_count = posts_count + $2 WHERE id = $1', [
      rows[0].id,
      count,
    ]);
  } finally {
    await client.end();
  }
}

/** Saves `theme` as `username`'s look, as /settings/display would (#31). */
export async function setTheme(username: string, theme: 'light' | 'dim' | 'dark'): Promise<void> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('UPDATE users SET theme = $2 WHERE username = $1', [username, theme]);
  } finally {
    await client.end();
  }
}
