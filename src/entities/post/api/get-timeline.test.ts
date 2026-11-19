import { makeFollow, makeLike, makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { sql } from 'drizzle-orm';
import { Client } from 'pg';
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

  // FR-CONV-04: 返信はタイムラインに出ない
  // FR-TL-01: 「フォロー中」
  // FR-TL-05: 削除した投稿を出さない
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

  // FR-TL-02: 「おすすめ」
  it('おすすめ: 全員の返信でない投稿', async () => {
    const me = await makeUser();
    const stranger = await makeUser();
    await makePost({ id: at(1), authorId: me.id, text: '自分' });
    await makePost({ id: at(2), authorId: stranger.id, text: '知らない人' });
    signInAs(me);
    const result = await getTimeline('for-you', null);
    expect(result.ok && result.page.items.map((post) => post.text)).toEqual(['知らない人', '自分']);
  });

  // FR-TL-05: 削除した投稿は、どちらのタブにも出ない
  it('削除した投稿は、フォロー中にもおすすめにも出ない（#30）', async () => {
    const me = await makeUser();
    const friend = await makeUser();
    await makeFollow(me.id, friend.id);
    await makePost({ id: at(1), authorId: friend.id, text: '残る' });
    await makePost({ id: at(2), authorId: friend.id, text: '消した', deletedAt: new Date() });
    await makePost({ id: at(3), authorId: me.id, text: '自分が消した', deletedAt: new Date() });
    signInAs(me);
    for (const tab of ['following', 'for-you'] as const) {
      const result = await getTimeline(tab, null);
      expect(result.ok && result.page.items.map((post) => post.text)).toEqual(['残る']);
    }
  });

  // FR-CONV-06: リポストは、リポストした人のフォロワーの「フォロー中」に出る
  it('フォローしている人のリポストは「フォロー中」に元の投稿として出て、知らない人のリポストは出ない（#30）', async () => {
    const me = await makeUser();
    const friend = await makeUser({ name: 'フォロー中の人' });
    const stranger = await makeUser();
    const author = await makeUser();
    await makeFollow(me.id, friend.id);
    const original = await makePost({ id: at(1), authorId: author.id, text: '元の投稿' });
    const other = await makePost({ id: at(2), authorId: author.id, text: '別の投稿' });
    await makePost({ id: at(3), authorId: friend.id, text: '', repostOfId: original.id });
    await makePost({ id: at(4), authorId: stranger.id, text: '', repostOfId: other.id });
    signInAs(me);
    const result = await getTimeline('following', null);
    expect(
      result.ok && result.page.items.map((post) => [post.text, post.repostedBy?.name ?? null]),
    ).toEqual([['元の投稿', 'フォロー中の人']]);
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

  // NFR-SEC-03: クライアントへ渡すのは DTO だけで、パスワードのハッシュ・メールアドレス（本人の設定の画面を除く）・内部の列を含まない
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
      links: [],
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      media: [],
      counts: { replies: 0, reposts: 0, likes: 1, bookmarks: 0, views: 0 },
      viewer: { liked: true, reposted: false, bookmarked: false, isAuthor: true },
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

  it('1 ページ目は、いちばん上の行そのものの ID を newestId で返す（リポストなら元の投稿ではなくリポストの行、#28 レビュー 1）', async () => {
    const me = await makeUser();
    const friend = await makeUser();
    await makeFollow(me.id, friend.id);
    const old = await makePost({ id: at(1), authorId: friend.id, text: '古い投稿' });
    await makePost({ id: at(2), authorId: friend.id, text: '新しい投稿' });
    await makePost({ id: at(3), authorId: friend.id, text: '', repostOfId: old.id });
    signInAs(me);
    const first = await getTimeline('following', null);
    expect(first.ok && first.page.items[0].id).toBe(old.id.toString());
    expect(first.ok && first.page.newestId).toBe(at(3).toString());
    const next = await getTimeline('following', at(3));
    expect(next.ok && next.page.newestId).toBeUndefined();
  });

  it('一覧が空なら、読んだときの時刻の ID を newestId にする（それより新しい投稿を待てる、#28 レビュー 1）', async () => {
    signInAs(await makeUser());
    const before = newId({ now: Date.now(), random: 0 });
    const first = await getTimeline('following', null);
    const newest = BigInt((first.ok && first.page.newestId) || '0');
    expect(newest).toBeGreaterThanOrEqual(before);
    expect(newest).toBeLessThanOrEqual(newId({ now: Date.now() + 1, random: 0 }));
  });
});

describe('「フォロー中」の問い合わせの速さ（#32）', () => {
  // NFR-PERF-06: 投稿が 10 万件あっても、フォロー中の 1 ページは索引で 50 ミリ秒以下
  it('投稿が 10 万件あり、フォローした 1 人の投稿がまばらでも、1 ページを索引で 50 ミリ秒以下で読む', async () => {
    const me = await makeUser();
    const friend = await makeUser();
    const others = await makeUser();
    await makeFollow(me.id, friend.id);
    // 100,000 posts, one in a thousand by the person followed: the page skips ~20,000 rows.
    await testDb().execute(sql`
      insert into posts (id, author_id, text)
      select ${T0}::bigint * 4194304 + g, case when g % 1000 = 0 then ${friend.id} else ${others.id} end, '投稿 ' || g
      from generate_series(1, 100000) g`);
    await testDb().execute(sql`analyze posts`);
    signInAs(me);
    const sent = vi.spyOn(Client.prototype, 'query');
    const result = await getTimeline('following', null);
    if (!result.ok) throw new Error('expected ok');
    expect(result.page.items).toHaveLength(20);
    // Drizzle passes the statement as { text } and its values as the second argument.
    const [{ text }, values] = sent.mock.calls[0] as unknown as [{ text: string }, unknown[]];
    sent.mockRestore();
    const { rows } = await testDb().$client.query(`explain (analyze, format json) ${text}`, values);
    const [{ Plan: plan, 'Execution Time': ms }] = rows[0]['QUERY PLAN'];
    const scans =
      JSON.stringify(plan).match(/"Node Type":"[^"]+","[^}]*?"Relation Name":"posts"/g) ?? [];
    expect(scans.some((scan) => scan.includes('Seq Scan'))).toBe(false);
    expect(ms).toBeLessThanOrEqual(50);
  }, 60_000);
});
