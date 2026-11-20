import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProfilePage } from './load-profile-page';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

setupTestDb();
beforeEach(signOut);

describe('loadProfilePage（#23）', () => {
  it('プロフィールとタブの 1 ページ目と今の時刻を返す。ログインは要らない', async () => {
    const me = await makeUser({ username: 'hanako' });
    await makePost({ authorId: me.id, text: '投稿' });
    const data = await loadProfilePage('Hanako', 'posts');
    expect(data.profile.username).toBe('hanako');
    expect(data.tab).toBe('posts');
    expect(data.firstPage.items.map((item) => item.text)).toEqual(['投稿']);
    expect(data.signedIn).toBe(false);
    expect(Date.parse(data.now)).not.toBeNaN();
    signInAs(me);
    expect((await loadProfilePage('hanako', 'likes')).signedIn).toBe(true);
  });

  it('無いユーザー名は 404、他人のいいねのタブはプロフィールへ送る', async () => {
    await makeUser({ username: 'hanako' });
    signInAs(await makeUser());
    await expect(loadProfilePage('nobody', 'posts')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(loadProfilePage('hanako', 'likes')).rejects.toThrow('NEXT_REDIRECT /hanako');
  });
});
