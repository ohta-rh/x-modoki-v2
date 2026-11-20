import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookmarks } from '@/shared/db';
import { loadBookmarksPage } from './load-bookmarks-page';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

setupTestDb();
beforeEach(signOut);

describe('loadBookmarksPage（#21）', () => {
  it('入っていなければログインへ送る', async () => {
    await expect(loadBookmarksPage()).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
  });

  it('自分のブックマークの 1 ページ目と、自分のユーザー名と、今の時刻を返す', async () => {
    const me = await makeUser({ username: 'hanako' });
    const post = await makePost({ authorId: me.id, text: '取っておいた' });
    await testDb().insert(bookmarks).values({ userId: me.id, postId: post.id });
    signInAs(me);
    const data = await loadBookmarksPage();
    expect(data.firstPage.items.map((item) => item.text)).toEqual(['取っておいた']);
    expect(data.username).toBe('hanako');
    expect(Date.parse(data.now)).not.toBeNaN();
  });
});
