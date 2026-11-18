import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { makeUpload } from '@test/uploads';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { media, postMedia } from '@/shared/db';
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

describe('loadPostDetail の画像のビューア（#25、/{username}/status/{id}/photo/{n}）', () => {
  /** A post by taro with `count` ready images. */
  const postWithImages = async (count: number) => {
    const taro = await makeUser({ username: 'taro' });
    const post = await makePost({ authorId: taro.id });
    for (let position = 0; position < count; position += 1) {
      const upload = await makeUpload(taro.id, { put: false });
      await testDb().update(media).set({ status: 'ready' });
      await testDb().insert(postMedia).values({ postId: post.id, mediaId: upload.id, position });
    }
    return post;
  };

  it('n 枚目を返す。番号が無ければ null', async () => {
    const post = await postWithImages(2);
    expect((await loadPostDetail('taro', post.id.toString(), '2')).photo).toBe(2);
    expect((await loadPostDetail('taro', post.id.toString())).photo).toBeNull();
  });

  it.each(['0', '3', 'x', '1.5'])('画像の番号 %s は 404', async (n) => {
    const post = await postWithImages(2);
    await expect(loadPostDetail('taro', post.id.toString(), n)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('ユーザー名が作者と違えば、同じ画像の正しい URL へ送る', async () => {
    const post = await postWithImages(2);
    await expect(loadPostDetail('hana', post.id.toString(), '2')).rejects.toThrow(
      `NEXT_REDIRECT /taro/status/${post.id}/photo/2`,
    );
  });
});
