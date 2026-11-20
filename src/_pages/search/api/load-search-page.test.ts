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
// Search needs a session (routing.md 1, #33): each test searches as someone signed in.
beforeEach(async () => signInAs(await makeUser({ username: 'searcher' })));

describe('loadSearchPage（#27）', () => {
  it('ログインしていなければ、検索せずにログインへ送る（#33）', async () => {
    signOut();
    await expect(loadSearchPage('花子の', undefined)).rejects.toThrow(
      'NEXT_REDIRECT /i/flow/login',
    );
    await expect(loadSearchPage('hana', 'user')).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
  });

  it('投稿のタブは投稿の 1 ページ目、ユーザーのタブは人の 1 ページ目', async () => {
    const hana = await makeUser({ username: 'hana_ls', name: '花子' });
    await makePost({ authorId: hana.id, text: '花子の投稿' });
    signInAs(hana);
    const posts = await loadSearchPage('花子の', undefined);
    expect(posts).toMatchObject({ q: '花子の', filter: 'top', signedIn: true });
    expect(
      posts.results.kind === 'posts' && posts.results.page.items.map((item) => item.text),
    ).toEqual(['花子の投稿']);
    const users = await loadSearchPage(' hana_ls ', 'user');
    expect(users).toMatchObject({ q: 'hana_ls', filter: 'user', signedIn: true });
    expect(
      users.results.kind === 'users' && users.results.page.items.map((item) => item.username),
    ).toEqual(['hana_ls']);
    expect(Date.parse(users.now)).not.toBeNaN();
  });

  // FR-SEARCH-01: 本文の検索
  it('濁点を分けて書いた（NFD の）語でも、NFC で保存した投稿が見つかる（#66）', async () => {
    const hana = await makeUser({ username: 'hana_nfd' });
    await makePost({ authorId: hana.id, text: 'がっこうの話' });
    const found = await loadSearchPage('か\u3099っこう', 'live');
    expect(
      found.results.kind === 'posts' && found.results.page.items.map((item) => item.text),
    ).toEqual(['がっこうの話']);
  });

  it('同じ名前のパラメーターが並んでいれば、最初の値を使う', async () => {
    const hana = await makeUser({ username: 'hana_arr' });
    await makePost({ authorId: hana.id, text: '並んだ検索' });
    const data = await loadSearchPage(['並んだ', 'ほか'], ['live', 'user']);
    expect(data).toMatchObject({ q: '並んだ', filter: 'live' });
  });

  it('画面の URL の知らない f は、拒まずに「話題」として読む（人が打つ URL なので、#62）', async () => {
    const data = await loadSearchPage('知らない', 'nope');
    expect(data).toMatchObject({ q: '知らない', filter: 'top' });
  });

  it('q が空か長すぎれば、/explore へ送る', async () => {
    for (const q of [undefined, '', '   ', 'a'.repeat(101)]) {
      await expect(loadSearchPage(q, undefined)).rejects.toThrow('NEXT_REDIRECT /explore');
    }
  });
});
