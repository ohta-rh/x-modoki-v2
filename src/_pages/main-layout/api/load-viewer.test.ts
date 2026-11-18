import { setupTestDb, testDb } from '@test/db';
import { eq } from 'drizzle-orm';
import { user } from '@/shared/db';
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
  it('入っていなければ null（ログインを求めるのは proxy.ts と各ページ。/{username} はログインが要らない）', async () => {
    await expect((await load()).loadViewer()).resolves.toBeNull();
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
      unread: 0,
    });
  });

  it('アバターは、保存したキーではなく、画像の配信元の URL で返す（#25）', async () => {
    vi.resetModules();
    const { getAuth } = await import('@/shared/auth/index.server');
    const response = await getAuth().api.signUpEmail({
      body: {
        name: 'アバターの人',
        email: 'avatar_01@example.test',
        password: 'correct-horse-battery',
        username: 'avatar_01',
        displayUsername: 'avatar_01',
      },
      asResponse: true,
    });
    await testDb()
      .update(user)
      .set({ image: 'media/a.webp' })
      .where(eq(user.username, 'avatar_01'));
    request.headers = new Headers({ cookie: response.headers.get('set-cookie')!.split(';')[0] });
    const viewer = await (await load()).loadViewer();
    expect(viewer!.image).toMatch(/^https?:\/\/.+\/media\/a\.webp$/);
  });
});
