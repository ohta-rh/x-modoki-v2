import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSearchPage } from './load-search-page';

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

describe('loadSearchPage（#27）', () => {
  it('投稿のタブは投稿の 1 ページ目、ユーザーのタブは人の 1 ページ目。ログインしているかも返す', async () => {
    const hana = await makeUser({ username: 'hana_ls', name: '花子' });
    await makePost({ authorId: hana.id, text: '花子の投稿' });
    const posts = await loadSearchPage('花子の', undefined);
    expect(posts).toMatchObject({ q: '花子の', filter: 'top', signedIn: false });
    expect(
      posts.results.kind === 'posts' && posts.results.page.items.map((item) => item.text),
    ).toEqual(['花子の投稿']);
    signInAs(hana);
    const users = await loadSearchPage(' hana_ls ', 'user');
    expect(users).toMatchObject({ q: 'hana_ls', filter: 'user', signedIn: true });
    expect(
      users.results.kind === 'users' && users.results.page.items.map((item) => item.username),
    ).toEqual(['hana_ls']);
    expect(Date.parse(users.now)).not.toBeNaN();
  });

  it('同じ名前のパラメーターが並んでいれば、最初の値を使う', async () => {
    const hana = await makeUser({ username: 'hana_arr' });
    await makePost({ authorId: hana.id, text: '並んだ検索' });
    const data = await loadSearchPage(['並んだ', 'ほか'], ['live', 'user']);
    expect(data).toMatchObject({ q: '並んだ', filter: 'live' });
  });

  it('q が空か長すぎれば、/explore へ送る', async () => {
    for (const q of [undefined, '', '   ', 'a'.repeat(101)]) {
      await expect(loadSearchPage(q, undefined)).rejects.toThrow('NEXT_REDIRECT /explore');
    }
  });
});
