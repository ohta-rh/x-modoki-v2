import { setupTestDb } from '@test/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => request.headers }));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

setupTestDb();

async function load() {
  vi.resetModules();
  return import('./redirect-if-signed-in');
}

beforeEach(() => {
  request.headers = new Headers();
});

describe('redirectIfSignedIn', () => {
  it('入っていなければ何もしない', async () => {
    await expect((await load()).redirectIfSignedIn()).resolves.toBeUndefined();
  });

  it('入っていれば /home へ送る', async () => {
    vi.resetModules();
    const { getAuth } = await import('@/shared/auth/index.server');
    const response = await getAuth().api.signUpEmail({
      body: {
        name: 'サンプル',
        email: 's@example.test',
        password: 'correct-horse-battery',
        username: 'sample_01',
      },
      asResponse: true,
    });
    request.headers = new Headers({ cookie: response.headers.get('set-cookie')!.split(';')[0] });
    await expect((await load()).redirectIfSignedIn()).rejects.toThrow('NEXT_REDIRECT /home');
  });
});
