import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newId } from '@/shared/lib/id';
import { getPostDetail, getReplies } from './get-post-detail';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const T0 = Date.UTC(2026, 10, 18);
const at = (minute: number) => newId({ now: T0 + minute * 60_000, random: 0 });

async function thread() {
  const taro = await makeUser({ username: 'taro' });
  const hana = await makeUser({ username: 'hana' });
  const root = await makePost({ id: at(1), authorId: taro.id, text: '最初' });
  const middle = await makePost({
    id: at(2),
    authorId: hana.id,
    text: '中',
    replyToId: root.id,
    rootId: root.id,
  });
  const leaf = await makePost({
    id: at(3),
    authorId: taro.id,
    text: '末',
    replyToId: middle.id,
    rootId: root.id,
  });
  return { taro, hana, root, middle, leaf };
}

describe('getPostDetail（#20、data-model.md）', () => {
  it('本体と、上へたどった親（古い順）と、返信の 1 ページ目を返す。ログインは要らない', async () => {
    const { root, middle, leaf } = await thread();
    const result = await getPostDetail(middle.id);
    if (!result.ok) throw new Error('expected ok');
    expect(result.detail.post.text).toBe('中');
    expect(result.detail.post.replyTo).toEqual({ username: 'taro' });
    expect(result.detail.ancestors.map((item) => ('text' in item ? item.text : 'deleted'))).toEqual(
      ['最初'],
    );
    expect(result.detail.replies.items.map((post) => post.id)).toEqual([leaf.id.toString()]);
    const deep = await getPostDetail(leaf.id);
    expect(deep.ok && deep.detail.ancestors.map((item) => item.id)).toEqual([
      root.id.toString(),
      middle.id.toString(),
    ]);
  });

  it('削除された親は、印だけ（本文も作者も出さない）', async () => {
    const { middle, leaf } = await thread();
    const { testDb } = await import('@test/db');
    const { posts } = await import('@/shared/db');
    const { eq } = await import('drizzle-orm');
    await testDb().update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, middle.id));
    const result = await getPostDetail(leaf.id);
    expect(result.ok && result.detail.ancestors[1]).toEqual({
      id: middle.id.toString(),
      deleted: true,
    });
  });

  it('無い投稿と削除された投稿は NOT_FOUND', async () => {
    const me = await makeUser();
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    expect(await getPostDetail(newId())).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await getPostDetail(gone.id)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('見ている人が作者なら isAuthor', async () => {
    const { taro, root } = await thread();
    signInAs(taro);
    const result = await getPostDetail(root.id);
    expect(result.ok && result.detail.post.viewer.isAuthor).toBe(true);
    signOut();
    const anonymous = await getPostDetail(root.id);
    expect(anonymous.ok && anonymous.detail.post.viewer.isAuthor).toBe(false);
  });
});

describe('getReplies', () => {
  it('直接の返信を古い順に 20 件ずつ。削除済みと孫は出さない', async () => {
    const me = await makeUser();
    const parent = await makePost({ id: at(0), authorId: me.id });
    const ids = [];
    for (let i = 1; i <= 22; i += 1) {
      const reply = await makePost({
        id: at(i),
        authorId: me.id,
        replyToId: parent.id,
        rootId: parent.id,
        text: `返信 ${i}`,
      });
      ids.push(reply.id);
    }
    await makePost({
      id: at(30),
      authorId: me.id,
      replyToId: parent.id,
      rootId: parent.id,
      deletedAt: new Date(),
    });
    await makePost({
      id: at(31),
      authorId: me.id,
      replyToId: ids[0],
      rootId: parent.id,
      text: '孫',
    });
    const first = await getReplies(parent.id, null);
    expect(first.items.map((post) => post.text)).toEqual(
      Array.from({ length: 20 }, (_, i) => `返信 ${i + 1}`),
    );
    expect(first.nextCursor).toBe(ids[19].toString());
    const second = await getReplies(parent.id, ids[19]);
    expect(second.items.map((post) => post.text)).toEqual(['返信 21', '返信 22']);
    expect(second.nextCursor).toBeNull();
  });
});
