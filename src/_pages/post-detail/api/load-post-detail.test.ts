import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newId } from '@/shared/lib/id';
import { loadPostDetail } from './load-post-detail';

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

describe('loadPostDetail（routing.md の 3 節）', () => {
  it('詳細と、入っているかどうかと、今の時刻を返す（ログインは要らない）', async () => {
    const taro = await makeUser({ username: 'taro' });
    const post = await makePost({ authorId: taro.id, text: '本文' });
    const data = await loadPostDetail('taro', post.id.toString());
    expect(data.detail.post.text).toBe('本文');
    expect(data.signedIn).toBe(false);
    signInAs(taro);
    expect((await loadPostDetail('taro', post.id.toString())).signedIn).toBe(true);
    expect(Date.parse(data.now)).not.toBeNaN();
  });

  it('ユーザー名が作者と違えば、正しい URL へ送る（大文字と小文字の違いも）', async () => {
    const taro = await makeUser({ username: 'taro' });
    const post = await makePost({ authorId: taro.id });
    await expect(loadPostDetail('hana', post.id.toString())).rejects.toThrow(
      `NEXT_REDIRECT /taro/status/${post.id}`,
    );
    await expect(loadPostDetail('Taro', post.id.toString())).rejects.toThrow(
      `NEXT_REDIRECT /taro/status/${post.id}`,
    );
  });

  it.each(['abc', '0', newId().toString()])('ID %s は 404', async (id) => {
    await expect(loadPostDetail('taro', id)).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
