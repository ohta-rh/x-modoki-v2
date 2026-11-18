import { makeFollow, makeLike, makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newId } from '@/shared/lib/id';
import { getTimeline } from './get-timeline';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const T0 = Date.UTC(2026, 10, 18);
const at = (minute: number) => newId({ now: T0 + minute * 60_000, random: 0 });

describe('getTimeline（data-model.md の 4 節、ADR-0015）', () => {
  it('ログインが無ければ UNAUTHORIZED', async () => {
    expect(await getTimeline('following', null)).toEqual({ ok: false, error: 'UNAUTHORIZED' });
  });

  it('フォロー中: 自分とフォローしている人の、返信でない・削除されていない投稿を、新しい順に', async () => {
    const me = await makeUser();
    const friend = await makeUser();
    const stranger = await makeUser();
    await makeFollow(me.id, friend.id);
    const mine = await makePost({ id: at(1), authorId: me.id, text: '自分' });
    await makePost({ id: at(2), authorId: friend.id, text: 'フォロー中' });
    await makePost({ id: at(3), authorId: stranger.id, text: '知らない人' });
    await makePost({
      id: at(4),
      authorId: friend.id,
      text: '返信',
      replyToId: mine.id,
      rootId: mine.id,
    });
    await makePost({ id: at(5), authorId: friend.id, text: '削除済み', deletedAt: new Date() });
    signInAs(me);
    const result = await getTimeline('following', null);
    expect(result.ok && result.page.items.map((post) => post.text)).toEqual(['フォロー中', '自分']);
  });

  it('おすすめ: 全員の返信でない投稿', async () => {
    const me = await makeUser();
    const stranger = await makeUser();
    await makePost({ id: at(1), authorId: me.id, text: '自分' });
    await makePost({ id: at(2), authorId: stranger.id, text: '知らない人' });
    signInAs(me);
    const result = await getTimeline('for-you', null);
    expect(result.ok && result.page.items.map((post) => post.text)).toEqual(['知らない人', '自分']);
  });

  it('20 件ずつ。21 件目があればカーソルを返し、カーソルの次から続きを返し、最後は null', async () => {
    const me = await makeUser();
    for (let i = 1; i <= 25; i += 1)
      await makePost({ id: at(i), authorId: me.id, text: `投稿 ${i}` });
    signInAs(me);
    const first = await getTimeline('following', null);
    if (!first.ok) throw new Error('expected ok');
    expect(first.page.items).toHaveLength(20);
    expect(first.page.items[0].text).toBe('投稿 25');
    expect(first.page.nextCursor).toBe(at(6).toString());
    const second = await getTimeline('following', BigInt(first.page.nextCursor!));
    expect(second.ok && second.page.items.map((post) => post.text)).toEqual([
      '投稿 5',
      '投稿 4',
      '投稿 3',
      '投稿 2',
      '投稿 1',
    ]);
    expect(second.ok && second.page.nextCursor).toBeNull();
  });

  it('DTO の形: ID は文字列、作者・数・見ている人のいいね。メールやハッシュを含まない（NFR-SEC-03）', async () => {
    const me = await makeUser({ name: 'サンプル', username: 'sample_01' });
    const post = await makePost({ id: at(1), authorId: me.id, text: 'こんにちは', likeCount: 1 });
    await makeLike(me.id, post.id);
    signInAs(me);
    const result = await getTimeline('following', null);
    if (!result.ok) throw new Error('expected ok');
    expect(result.page.items[0]).toEqual({
      id: at(1).toString(),
      author: { username: 'sample_01', name: 'サンプル', avatarUrl: null },
      text: 'こんにちは',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      media: [],
      counts: { replies: 0, reposts: 0, likes: 1, bookmarks: 0, views: 0 },
      viewer: { liked: true, reposted: false, bookmarked: false },
      repostedBy: null,
      replyTo: null,
      quoted: null,
    });
    expect(JSON.stringify(result.page)).not.toMatch(/email|password/);
  });

  it('作者に画像があれば、公開の URL にする', async () => {
    const me = await makeUser({ image: 'avatars/a.webp' });
    await makePost({ id: at(1), authorId: me.id });
    signInAs(me);
    const result = await getTimeline('following', null);
    expect(result.ok && result.page.items[0].author.avatarUrl).toMatch(/\/avatars\/a\.webp$/);
  });
});
