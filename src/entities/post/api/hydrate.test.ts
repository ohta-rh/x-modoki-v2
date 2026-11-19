import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { media, postMedia } from '@/shared/db';
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

describe('一覧のリポストと引用（#22）', () => {
  it('リポストの行は、元の投稿として出て repostedBy が付く。元が消されたリポストは出ない', async () => {
    const author = await makeUser({ username: 'author', name: '書いた人' });
    const me = await makeUser({ username: 'me', name: '自分' });
    const post = await makePost({ id: at(1), authorId: author.id, text: '元の投稿' });
    const gone = await makePost({ id: at(2), authorId: author.id, deletedAt: new Date() });
    await makePost({ id: at(3), authorId: me.id, text: '', repostOfId: post.id });
    await makePost({ id: at(4), authorId: me.id, text: '', repostOfId: gone.id });
    await makePost({ id: at(5), authorId: author.id, text: '', repostOfId: post.id });
    signInAs(me);
    const result = await getTimeline('for-you', null);
    if (!result.ok) throw new Error('expected ok');
    const items = result.page.items;
    expect(items.map((item) => [item.text, item.repostedBy?.name ?? null])).toEqual([
      ['元の投稿', '書いた人'],
      ['元の投稿', '自分'],
      ['元の投稿', null],
    ]);
    expect(items[1].id).toBe(post.id.toString());
    expect(items[1].author.username).toBe('author');
    expect(items[1].viewer.reposted).toBe(true);
  });

  it('引用は quoted に元の投稿を持つ。元が消されていれば印だけ、元も引用なら quotesAnother', async () => {
    const author = await makeUser({ username: 'author', name: '書いた人' });
    const first = await makePost({ id: at(1), authorId: author.id, text: '最初' });
    const quote = await makePost({
      id: at(2),
      authorId: author.id,
      text: '引用',
      quoteOfId: first.id,
    });
    const gone = await makePost({ id: at(3), authorId: author.id, deletedAt: new Date() });
    await makePost({ id: at(4), authorId: author.id, text: '消えた元', quoteOfId: gone.id });
    await makePost({ id: at(5), authorId: author.id, text: '引用の引用', quoteOfId: quote.id });
    signInAs(author);
    const result = await getTimeline('for-you', null);
    if (!result.ok) throw new Error('expected ok');
    const [quoteOfQuote, ofGone, plain] = result.page.items;
    expect(quoteOfQuote.quoted).toEqual({
      id: quote.id.toString(),
      author: { username: 'author', name: '書いた人', avatarUrl: null },
      text: '引用',
      links: [],
      createdAt: quote.createdAt.toISOString(),
      quotesAnother: true,
    });
    expect(ofGone.quoted).toEqual({ id: gone.id.toString(), deleted: true });
    expect(plain.quoted).toMatchObject({ text: '最初', quotesAnother: false });
  });

  it('続きのカーソルは行（リポストの行）の ID で、欠けも重なりもない', async () => {
    const me = await makeUser();
    const post = await makePost({ id: at(0), authorId: me.id, text: '元' });
    for (let i = 1; i <= 21; i++) {
      await makePost({ id: at(i), authorId: (await makeUser()).id, text: '', repostOfId: post.id });
    }
    signInAs(me);
    const first = await getTimeline('for-you', null);
    if (!first.ok) throw new Error('expected ok');
    expect(first.page.nextCursor).toBe(at(2).toString());
    const second = await getTimeline('for-you', BigInt(first.page.nextCursor!));
    if (!second.ok) throw new Error('expected ok');
    expect(first.page.items.length + second.page.items.length).toBe(22);
  });

  it('画像は位置の順に、公開の URL・縦横・代替テキストで返す（#25）', async () => {
    const me = await makeUser();
    const post = await makePost({ id: at(1), authorId: me.id, text: '写真' });
    const rows = await testDb()
      .insert(media)
      .values([
        {
          id: newId(),
          ownerId: me.id,
          key: 'media/b.webp',
          mime: 'image/webp',
          width: 10,
          height: 20,
          alt: '二',
          status: 'ready' as const,
        },
        {
          id: newId(),
          ownerId: me.id,
          key: 'media/a.webp',
          mime: 'image/webp',
          width: 30,
          height: 40,
          alt: '',
          status: 'ready' as const,
        },
      ])
      .returning();
    await testDb()
      .insert(postMedia)
      .values([
        { postId: post.id, mediaId: rows[0].id, position: 1 },
        { postId: post.id, mediaId: rows[1].id, position: 0 },
      ]);
    signInAs(me);
    const result = await getTimeline('for-you', null);
    if (!result.ok) throw new Error('expected ok');
    expect(result.page.items[0].media).toEqual([
      {
        url: `${process.env.NEXT_PUBLIC_MEDIA_BASE_URL}/media/a.webp`,
        width: 30,
        height: 40,
        alt: '',
      },
      {
        url: `${process.env.NEXT_PUBLIC_MEDIA_BASE_URL}/media/b.webp`,
        width: 10,
        height: 20,
        alt: '二',
      },
    ]);
  });

  // NFR-PERF-05: 本文のリンクはサーバーで見つける（クライアントに twitter-text を送らない）
  it('本文の URL・#タグ・@名前の位置と行き先を links で返す。引用された投稿も（#32）', async () => {
    const author = await makeUser();
    const text = 'これ #タグ を見て https://example.com/a @Someone です';
    const original = await makePost({ id: at(1), authorId: author.id, text });
    await makePost({ id: at(2), authorId: author.id, text: 'リンクなし', quoteOfId: original.id });
    signInAs(author);
    const result = await getTimeline('for-you', null);
    if (!result.ok) throw new Error('expected ok');
    const [quote, plain] = result.page.items;
    const span = (value: string) => ({
      start: text.indexOf(value),
      end: text.indexOf(value) + value.length,
    });
    const links = [
      { type: 'hashtag', ...span('#タグ'), href: `/search?q=${encodeURIComponent('#タグ')}` },
      { type: 'url', ...span('https://example.com/a'), href: 'https://example.com/a' },
      { type: 'mention', ...span('@Someone'), href: '/someone' },
    ];
    expect(plain.links).toEqual(links);
    expect(quote.links).toEqual([]);
    expect(quote.quoted).toMatchObject({ text, links });
  });
});
