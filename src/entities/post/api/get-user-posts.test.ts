import { makeLike, makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { likes, media, postMedia, user } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { getUserPosts } from './get-user-posts';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const T0 = Date.UTC(2026, 10, 18);
const at = (minute: number) => newId({ now: T0 + minute * 60_000, random: 0 });
const texts = (result: Awaited<ReturnType<typeof getUserPosts>>) => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.page.items.map((item) => item.text);
};

describe('getUserPosts（#23）', () => {
  it('ポスト: 返信でない投稿とリポストを新しい順に。固定した投稿は 1 ページ目の先頭に pinned で 1 回だけ', async () => {
    const me = await makeUser({ username: 'me' });
    const other = await makeUser();
    const first = await makePost({ id: at(1), authorId: me.id, text: '最初' });
    await makePost({
      id: at(2),
      authorId: me.id,
      text: '返信',
      replyToId: first.id,
      rootId: first.id,
    });
    const theirs = await makePost({ id: at(3), authorId: other.id, text: '他人の' });
    await makePost({ id: at(4), authorId: me.id, text: '', repostOfId: theirs.id });
    await makePost({ id: at(5), authorId: me.id, text: '最新' });
    await makePost({ id: at(6), authorId: me.id, text: '消した', deletedAt: new Date() });
    await testDb().update(user).set({ pinnedPostId: first.id }).where(eq(user.id, me.id));
    const result = await getUserPosts('me', 'posts', null);
    expect(texts(result)).toEqual(['最初', '最新', '他人の']);
    if (!result.ok) throw new Error();
    expect(result.page.items[0].pinned).toBe(true);
    expect(result.page.items[1].pinned).toBeUndefined();
  });

  it('返信: 返信もリポストも含めて全部。メディア: 画像のある投稿だけ', async () => {
    const me = await makeUser({ username: 'me' });
    const first = await makePost({ id: at(1), authorId: me.id, text: '最初' });
    await makePost({
      id: at(2),
      authorId: me.id,
      text: '返信',
      replyToId: first.id,
      rootId: first.id,
    });
    const pictured = await makePost({ id: at(3), authorId: me.id, text: '写真' });
    const [m] = await testDb()
      .insert(media)
      .values({
        id: newId(),
        ownerId: me.id,
        key: 'k1',
        mime: 'image/webp',
        width: 1,
        height: 1,
        status: 'ready',
      })
      .returning();
    await testDb().insert(postMedia).values({ postId: pictured.id, mediaId: m.id, position: 0 });
    expect(texts(await getUserPosts('me', 'with_replies', null))).toEqual(['写真', '返信', '最初']);
    expect(texts(await getUserPosts('me', 'media', null))).toEqual(['写真']);
  });

  it('いいね: 本人だけが、いいねした順の新しい順で読める。他人は FORBIDDEN', async () => {
    const me = await makeUser({ username: 'me' });
    const other = await makeUser({ username: 'other' });
    const a = await makePost({ id: at(1), authorId: other.id, text: 'A' });
    const b = await makePost({ id: at(2), authorId: other.id, text: 'B' });
    await makeLike(me.id, b.id);
    await makeLike(me.id, a.id);
    await testDb()
      .update(likes)
      .set({ createdAt: new Date(T0 + 1000) })
      .where(eq(likes.postId, b.id));
    await testDb()
      .update(likes)
      .set({ createdAt: new Date(T0 + 2000) })
      .where(eq(likes.postId, a.id));
    expect(await getUserPosts('me', 'likes', null)).toEqual({ ok: false, error: 'FORBIDDEN' });
    signInAs(other);
    expect(await getUserPosts('me', 'likes', null)).toEqual({ ok: false, error: 'FORBIDDEN' });
    signInAs(me);
    expect(texts(await getUserPosts('me', 'likes', null))).toEqual(['A', 'B']);
  });

  it('20 件ずつカーソルで続く（いいねは時刻と ID の組のカーソル）。無いユーザーは NOT_FOUND、形の違うカーソルは BAD_CURSOR', async () => {
    const me = await makeUser({ username: 'me' });
    for (let i = 1; i <= 21; i++) {
      const post = await makePost({ id: at(i), authorId: me.id, text: `p${i}` });
      await makeLike(me.id, post.id);
    }
    signInAs(me);
    for (const tab of ['posts', 'likes'] as const) {
      const first = await getUserPosts('me', tab, null);
      if (!first.ok) throw new Error();
      expect(first.page.items).toHaveLength(20);
      const second = await getUserPosts('me', tab, first.page.nextCursor);
      if (!second.ok) throw new Error();
      expect(second.page.items).toHaveLength(1);
      expect(second.page.nextCursor).toBeNull();
    }
    expect(await getUserPosts('nobody', 'posts', null)).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await getUserPosts('me', 'posts', 'abc')).toEqual({ ok: false, error: 'BAD_CURSOR' });
    expect(await getUserPosts('me', 'likes', 'abc')).toEqual({ ok: false, error: 'BAD_CURSOR' });
  });
});
