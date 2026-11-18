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
  return import('./load-viewer');
}

beforeEach(() => {
  request.headers = new Headers();
});

describe('loadViewer', () => {
  it('入っていなければログインへ送る（proxy.ts だけに頼らない）', async () => {
    await expect((await load()).loadViewer()).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
  });

  it('入っていれば、左ナビに要る名前・ユーザー名・画像だけを返す', async () => {
    vi.resetModules();
    const { getAuth } = await import('@/shared/auth/index.server');
    const response = await getAuth().api.signUpEmail({
      body: {
        name: 'サンプル',
        email: 'sample_01@example.test',
        password: 'correct-horse-battery',
        username: 'sample_01',
        displayUsername: 'Sample_01',
      },
      asResponse: true,
    });
    request.headers = new Headers({ cookie: response.headers.get('set-cookie')!.split(';')[0] });
    expect(await (await load()).loadViewer()).toEqual({
      name: 'サンプル',
      username: 'sample_01',
      image: null,
    });
  });
});
