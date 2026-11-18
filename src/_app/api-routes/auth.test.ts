import { setupTestDb, testDb } from '@test/db';
import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

setupTestDb();

const post = (path: string, body: object) =>
  new Request(`http://localhost:3000/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('authHandler（app/api/auth/[...all]）', () => {
  it('Better Auth へ渡す: cookie の無い get-session は null を返す', async () => {
    const { authHandler } = await import('./auth');
    const response = await authHandler(new Request('http://localhost:3000/api/auth/get-session'));
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it.each([
    [
      '/sign-up/email',
      { name: 'x', email: 'h@example.test', password: 'correct-horse-battery', username: 'home' },
    ],
    ['/sign-in/username', { username: 'someone', password: 'x' }],
    ['/sign-in/email', { email: 'h@example.test', password: 'x' }],
  ])(
    'T-09・T-10: %s は外から呼べない（登録とログインは、検証と回数の制限のある Server Action だけ）',
    async (path, body) => {
      const { authHandler } = await import('./auth');
      const response = await authHandler(post(path, body));
      expect(response.status).toBe(404);
      const { rows } = await testDb().execute<{ n: number }>(
        sql`SELECT count(*)::int AS n FROM users`,
      );
      expect(rows[0].n).toBe(0);
    },
  );
});
