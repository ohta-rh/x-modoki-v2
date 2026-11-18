import { setupTestDb } from '@test/db';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

setupTestDb();

describe('authHandler（app/api/auth/[...all]）', () => {
  it('Better Auth へ渡す: cookie の無い get-session は null を返す', async () => {
    const { authHandler } = await import('./auth');
    const response = await authHandler(new Request('http://localhost:3000/api/auth/get-session'));
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });
});
