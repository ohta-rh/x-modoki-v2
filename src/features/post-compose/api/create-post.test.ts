import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { jpegHead, makeUpload, pngHead, webpHead } from '@test/uploads';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hashtags,
  media,
  mentions,
  notifications,
  postHashtags,
  postMedia,
  posts,
  user,
} from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { sniffImage } from '@/shared/lib/image';
import { presignUpload, readHead } from '@/shared/storage';
import { createPost } from './create-post';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('createPost（FR-POST、NFR-SEC-01・02・05）', () => {
  // FR-POST-01: 本文を投稿する
  it('本文の前後の空白と改行は削って保存し、途中の改行と空白は残す（#67）', async () => {
    const me = await makeUser();
    signInAs(me);
    expect(await createPost('\n\n  前の行\n  次の行  \n\n')).toMatchObject({ ok: true });
    const [row] = await testDb().select().from(posts);
    expect(row.text).toBe('前の行\n  次の行');
  });

  it('U+0000 は除いて保存する（PostgreSQL が受け付けず、500 になっていた、#89）', async () => {
    signInAs(await makeUser());
    expect(await createPost('見えない\u0000文字')).toMatchObject({ ok: true });
    const [row] = await testDb().select().from(posts);
    expect(row.text).toBe('見えない文字');
  });

  // AUTHZ: createPost UNAUTHORIZED
  it('ログインが無ければ UNAUTHORIZED で、何も書かない', async () => {
    expect(await createPost('こんにちは')).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect(await testDb().select().from(posts)).toEqual([]);
  });

  it.each([
    ['空', '   '],
    ['281 の重み', 'a'.repeat(281)],
  ])('%s の本文は VALIDATION', async (_, text) => {
    signInAs(await makeUser());
    expect(await createPost(text)).toEqual({ ok: false, error: 'VALIDATION' });
    expect(await testDb().select().from(posts)).toEqual([]);
  });

  // FR-PROF-09: 投稿の数
  // NFR-I18N-03: 日本語・絵文字・結合文字・右から左の文字を含む本文が、崩れずに保存され、出る
  it('NFC にそろえた本文で投稿を作り、作者の投稿の数を 1 増やす', async () => {
    const me = await makeUser();
    signInAs(me);
    const result = await createPost('がです');
    expect(result).toEqual({ ok: true, id: expect.stringMatching(/^\d+$/) });
    const [row] = await testDb().select().from(posts);
    expect(row.text).toBe('がです');
    expect(row.authorId).toBe(me.id);
    expect((await testDb().select().from(user).where(eq(user.id, me.id)))[0].postsCount).toBe(1);
  });

  // FR-POST-14: ハッシュタグとメンションの記録
  it('ハッシュタグ（小文字にそろえて重ねない）とメンション（実在する人だけ）を、同じ投稿に結ぶ', async () => {
    const me = await makeUser();
    const taro = await makeUser({ username: 'taro_x' });
    signInAs(me);
    const result = await createPost('#Next と #next と #ハッシュ @Taro_X @taro_x @nobody_here');
    if (!result.ok) throw new Error('expected ok');
    expect(
      (await testDb().select({ tag: hashtags.tag }).from(hashtags)).map((row) => row.tag).sort(),
    ).toEqual(['next', 'ハッシュ']);
    expect(await testDb().select().from(postHashtags)).toHaveLength(2);
    expect(await testDb().select({ userId: mentions.userId }).from(mentions)).toEqual([
      { userId: taro.id },
    ]);
  });

  it('実在しない人だけへのメンションは、結ばずに投稿する', async () => {
    signInAs(await makeUser());
    expect((await createPost('@nobody_here こんにちは')).ok).toBe(true);
    expect(await testDb().select().from(mentions)).toEqual([]);
  });

  it('既にあるハッシュタグは作り直さず、結ぶだけ', async () => {
    const me = await makeUser();
    signInAs(me);
    await createPost('#共通');
    await createPost('#共通 もう一度');
    expect(await testDb().select().from(hashtags)).toHaveLength(1);
    expect(await testDb().select().from(postHashtags)).toHaveLength(2);
  });

  it('途中で失敗したら、投稿もハッシュタグも残さない（1 つのトランザクション）', async () => {
    signInAs(await makeUser());
    let calls = 0;
    const failingIds = () => {
      calls += 1;
      if (calls > 1) throw new Error('boom');
      return newId();
    };
    await expect(createPost('#残らない', { newId: failingIds })).rejects.toThrow('boom');
    expect(await testDb().select().from(posts)).toEqual([]);
    expect(await testDb().select().from(hashtags)).toEqual([]);
  });

  it('ADR-0016: ID がぶつかったら、作り直して 1 回だけやり直す', async () => {
    const me = await makeUser();
    const taken = newId();
    await makePost({ id: taken, authorId: me.id });
    signInAs(me);
    const ids = [taken, newId()];
    const result = await createPost('ぶつかる', { newId: () => ids.shift() ?? newId() });
    expect(result.ok).toBe(true);
    expect(await testDb().select().from(posts)).toHaveLength(2);
  });

  // FR-POST-13: 投稿の回数の制限
  it('NFR-SEC-05: 同じ人の 11 回目は 1 分の中で RATE_LIMITED', async () => {
    // hitRateLimit counts in one-minute windows; pin the clock mid-minute so the 11 calls share one.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T12:00:10Z'));
    signInAs(await makeUser());
    for (let i = 0; i < 10; i += 1) expect((await createPost(`投稿 ${i}`)).ok).toBe(true);
    expect(await createPost('11 回目')).toEqual({ ok: false, error: 'RATE_LIMITED' });
    vi.useRealTimers();
  });
});

describe('createPost のやり直し（#76）', () => {
  const count = async () => (await testDb().select().from(posts)).length;

  it('応答が届かずに同じ投稿をもう一度送ると、新しく作らず、前の投稿の ID で成功を返す（数も増やさない）', async () => {
    const me = await makeUser();
    signInAs(me);
    const first = await createPost('届いたか分からない投稿');
    const again = await createPost('  届いたか分からない投稿\n');
    expect(again).toEqual(first);
    expect(await count()).toBe(1);
    const [row] = await testDb().select().from(user).where(eq(user.id, me.id));
    expect(row.postsCount).toBe(1);
  });

  it('同じ返信・同じ画像の投稿のやり直しも 1 つにまとめる。親の返信の数も 1 のまま', async () => {
    const me = await makeUser();
    signInAs(me);
    const root = await makePost({ authorId: me.id, text: '親' });
    const upload = await makeUpload(me.id);
    const options = { replyToId: root.id, media: [{ id: upload.id, alt: '' }] };
    const first = await createPost('画像つきの返信', options);
    expect(first.ok).toBe(true);
    expect(await createPost('画像つきの返信', options)).toEqual(first);
    const [parent] = await testDb().select().from(posts).where(eq(posts.id, root.id));
    expect(parent.replyCount).toBe(1);
  });

  it('返信先・引用元・画像が違う、ほかの人の、60 秒を過ぎた、消した同じ本文は、別の投稿になる', async () => {
    const me = await makeUser();
    const other = await makeUser();
    signInAs(me);
    const root = await makePost({ authorId: other.id, text: '親' });
    await createPost('同じ本文');
    await createPost('同じ本文', { replyToId: root.id });
    await createPost('同じ本文', { quoteOfId: root.id });
    await createPost('同じ本文', { media: [{ id: (await makeUpload(me.id)).id, alt: '' }] });
    signInAs(other);
    await createPost('同じ本文');
    signInAs(me);
    await testDb()
      .update(posts)
      .set({ createdAt: new Date(Date.now() - 61_000) })
      .where(eq(posts.authorId, other.id));
    signInAs(other);
    expect((await createPost('同じ本文')).ok).toBe(true);
    const mine = await makePost({ authorId: me.id, text: '消した本文' });
    await testDb().update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, mine.id));
    signInAs(me);
    expect((await createPost('消した本文')).ok).toBe(true);
    // 4 of mine, 2 of the other person's, the deleted one and the new one after it, and the parent.
    expect(await count()).toBe(9);
  });
});

describe('createPost の返信（#20）', () => {
  it('返信は reply_to_id と root_id を持ち、相手の返信の数を同じトランザクションで 1 増やす', async () => {
    const me = await makeUser();
    signInAs(me);
    const root = await makePost({ authorId: me.id, text: '最初' });
    const first = await createPost('一つ目の返信', { replyToId: root.id });
    if (!first.ok) throw new Error('expected ok');
    const second = await createPost('返信への返信', { replyToId: BigInt(first.id) });
    if (!second.ok) throw new Error('expected ok');
    const rows = await testDb().select().from(posts);
    const byId = new Map(rows.map((row) => [row.id.toString(), row]));
    expect(byId.get(first.id)).toMatchObject({ replyToId: root.id, rootId: root.id });
    expect(byId.get(second.id)).toMatchObject({ replyToId: BigInt(first.id), rootId: root.id });
    expect(byId.get(root.id.toString())?.replyCount).toBe(1);
    expect(byId.get(first.id)?.replyCount).toBe(1);
  });

  it('無い投稿と削除された投稿には返信できない（NOT_FOUND、何も書かない）', async () => {
    const me = await makeUser();
    signInAs(me);
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    expect(await createPost('返信', { replyToId: gone.id })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(await createPost('返信', { replyToId: newId() })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(await testDb().select().from(posts)).toHaveLength(1);
  });

  it('確かめたあと、書く前に親が消されたら、返信は書かず NOT_FOUND（#20 のレビュー）', async () => {
    const me = await makeUser();
    signInAs(me);
    const parent = await makePost({ authorId: me.id });
    const db = testDb();
    const transaction = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementationOnce(async (run) => {
      await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, parent.id));
      return transaction(run);
    });
    expect(await createPost('返信', { replyToId: parent.id })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    const rows = await db.select().from(posts);
    expect(rows).toHaveLength(1);
    expect(rows[0].replyCount).toBe(0);
  });
});

describe('createPost の引用（#22）', () => {
  it('引用は quote_of_id を持ち、元の quote_count を 1 増やす。リポストを引用すると元の投稿の引用になる', async () => {
    const author = await makeUser();
    const me = await makeUser();
    const post = await makePost({ authorId: author.id });
    const repost = await makePost({ authorId: author.id, text: '', repostOfId: post.id });
    signInAs(me);
    const first = await createPost('意見', { quoteOfId: post.id });
    const second = await createPost('もう一つ', { quoteOfId: repost.id });
    if (!first.ok || !second.ok) throw new Error('expected ok');
    const rows = await testDb().select().from(posts).where(eq(posts.authorId, me.id));
    expect(rows.map((r) => r.quoteOfId)).toEqual([post.id, post.id]);
    const [original] = await testDb().select().from(posts).where(eq(posts.id, post.id));
    expect(original.quoteCount).toBe(2);
  });

  it('無い投稿・削除された投稿、確かめたあとに消された投稿は引用できない（NOT_FOUND）', async () => {
    const me = await makeUser();
    signInAs(me);
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    expect(await createPost('引用', { quoteOfId: gone.id })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(await createPost('引用', { quoteOfId: newId() })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    const target = await makePost({ authorId: me.id });
    const db = testDb();
    const transaction = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementationOnce(async (run) => {
      await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, target.id));
      return transaction(run);
    });
    expect(await createPost('引用', { quoteOfId: target.id })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect((await db.select().from(posts).where(eq(posts.id, target.id)))[0].quoteCount).toBe(0);
  });
});

describe('createPost の画像（#25、T-07・T-08）', () => {
  // FR-POST-07: 代替テキスト
  it('置かれた画像を確かめてから ready にし、代替テキストと順に結びつける。本文が空でもよい', async () => {
    const me = await makeUser();
    signInAs(me);
    const a = await makeUpload(me.id);
    const b = await makeUpload(me.id);
    const result = await createPost('', {
      media: [
        { id: b.id, alt: '二枚目' },
        { id: a.id, alt: '' },
      ],
    });
    if (!result.ok) throw new Error(result.error);
    const links = await testDb()
      .select()
      .from(postMedia)
      .where(eq(postMedia.postId, BigInt(result.id)));
    expect(links.sort((x, y) => x.position - y.position).map((link) => link.mediaId)).toEqual([
      b.id,
      a.id,
    ]);
    const rows = await testDb().select().from(media);
    expect(rows.every((row) => row.status === 'ready')).toBe(true);
    expect(rows.find((row) => row.id === b.id)!.alt).toBe('二枚目');
  });

  // NFR-SEC-07: 画像は、署名の前に種類と大きさを、置かれたあとに先頭のバイトで種類と縦横を確かめる。アプリとは別のドメイン（ローカルは別のポート）から出す
  // AUTHZ: createPost FORBIDDEN
  it('他人の画像・無い画像・置かれていない画像・申告と違う中身（PNG を WebP と偽る、縦横の違い）・使用済みは拒み、何も書かない', async () => {
    const me = await makeUser();
    const other = await makeUser();
    signInAs(me);
    const cases = [
      (await makeUpload(other.id)).id,
      123456789n,
      (await makeUpload(me.id, { put: false })).id,
      (await makeUpload(me.id, { bytes: pngHead() })).id,
      (await makeUpload(me.id, { width: 301 })).id,
    ];
    for (const id of cases) {
      expect(await createPost('写真', { media: [{ id, alt: '' }] })).toEqual({
        ok: false,
        error: 'VALIDATION',
      });
    }
    const used = await makeUpload(me.id);
    expect((await createPost('一回目', { media: [{ id: used.id, alt: '' }] })).ok).toBe(true);
    expect(await createPost('二回目', { media: [{ id: used.id, alt: '' }] })).toEqual({
      ok: false,
      error: 'VALIDATION',
    });
    const posted = await testDb().select().from(posts).where(eq(posts.authorId, me.id));
    expect(posted.map((row) => row.text)).toEqual(['一回目']);
  });

  it('JPEG も、サイズの印が 32 バイトより後ろにあっても確かめて結びつける（ADR-0043）', async () => {
    const me = await makeUser();
    signInAs(me);
    const upload = await makeUpload(me.id, { bytes: jpegHead(300, 200), mime: 'image/jpeg' });
    expect((await createPost('', { media: [{ id: upload.id, alt: '' }] })).ok).toBe(true);
  });

  it('同じ画像を 2 回付けることはできない', async () => {
    const me = await makeUser();
    signInAs(me);
    const upload = await makeUpload(me.id);
    expect(
      await createPost('二重', {
        media: [
          { id: upload.id, alt: '' },
          { id: upload.id, alt: '' },
        ],
      }),
    ).toEqual({ ok: false, error: 'VALIDATION' });
  });

  it('5 枚は拒み、代替テキストは 1,000 文字まで', async () => {
    const me = await makeUser();
    signInAs(me);
    const five = await Promise.all([1, 2, 3, 4, 5].map(() => makeUpload(me.id)));
    expect(await createPost('多い', { media: five.map((m) => ({ id: m.id, alt: '' })) })).toEqual({
      ok: false,
      error: 'VALIDATION',
    });
    expect(
      await createPost('長い', { media: [{ id: five[0].id, alt: 'あ'.repeat(1001) }] }),
    ).toEqual({ ok: false, error: 'VALIDATION' });
  });

  it('確かめたあと、書く前に画像がほかの投稿に使われたら、拒み何も書かない', async () => {
    const me = await makeUser();
    signInAs(me);
    const upload = await makeUpload(me.id);
    const db = testDb();
    const transaction = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementationOnce(async (run) => {
      await db.update(media).set({ status: 'ready' }).where(eq(media.id, upload.id));
      return transaction(run);
    });
    expect(await createPost('写真', { media: [{ id: upload.id, alt: '' }] })).toEqual({
      ok: false,
      error: 'VALIDATION',
    });
    expect(await db.select().from(posts).where(eq(posts.authorId, me.id))).toEqual([]);
  });

  it('2 枚のうち 1 枚だけがほかの投稿に使われたら、拒み、もう 1 枚は pending のまま残す（レビュー 1）', async () => {
    const me = await makeUser();
    signInAs(me);
    const a = await makeUpload(me.id);
    const b = await makeUpload(me.id);
    const db = testDb();
    const transaction = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementationOnce(async (run) => {
      await db.update(media).set({ status: 'ready' }).where(eq(media.id, b.id));
      return transaction(run);
    });
    expect(
      await createPost('写真', {
        media: [
          { id: a.id, alt: '' },
          { id: b.id, alt: '' },
        ],
      }),
    ).toEqual({ ok: false, error: 'VALIDATION' });
    const [row] = await db.select({ status: media.status }).from(media).where(eq(media.id, a.id));
    expect(row.status).toBe('pending');
  });

  it('画像つきの返信で、書く前に親が消されたら、NOT_FOUND を返し、画像は pending のまま残す（レビュー 1）', async () => {
    const me = await makeUser();
    signInAs(me);
    const parent = await makePost({ authorId: me.id });
    const upload = await makeUpload(me.id);
    const db = testDb();
    const transaction = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementationOnce(async (run) => {
      await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, parent.id));
      return transaction(run);
    });
    expect(
      await createPost('返信', { replyToId: parent.id, media: [{ id: upload.id, alt: '' }] }),
    ).toEqual({ ok: false, error: 'NOT_FOUND' });
    const [row] = await db
      .select({ status: media.status })
      .from(media)
      .where(eq(media.id, upload.id));
    expect(row.status).toBe('pending');
  });

  it('投稿したあと、まだ有効な署名つき URL で元のキーを上書きしても、投稿の画像は確かめた中身のまま（レビュー 2）', async () => {
    const me = await makeUser();
    signInAs(me);
    const upload = await makeUpload(me.id);
    const result = await createPost('写真', { media: [{ id: upload.id, alt: '' }] });
    if (!result.ok) throw new Error(result.error);
    // The same key, type and length the browser was allowed to PUT: different content.
    const forged = pngHead().slice(0, webpHead(300, 200).length);
    const url = await presignUpload({
      key: upload.key,
      contentType: 'image/webp',
      contentLength: forged.length,
    });
    expect(
      (await fetch(url, { method: 'PUT', body: forged, headers: { 'content-type': 'image/webp' } }))
        .ok,
    ).toBe(true);
    const [row] = await testDb().select().from(media).where(eq(media.id, upload.id));
    expect(sniffImage((await readHead(row.key, 1024))!)).toEqual({
      type: 'image/webp',
      width: 300,
      height: 200,
    });
  });
});

describe('createPost の通知（#26）', () => {
  const notes = () =>
    testDb()
      .select({
        recipientId: notifications.recipientId,
        actorId: notifications.actorId,
        type: notifications.type,
        postId: notifications.postId,
      })
      .from(notifications);

  // FR-NOTIF-01: 6 種類の通知
  it('返信は親の作者へ、引用は元の作者へ、メンションは本文の中の実在する全員へ。どれも新しい投稿を指す。自分には作らない', async () => {
    const me = await makeUser({ username: 'me_26' });
    const hana = await makeUser({ username: 'hana_26' });
    const jiro = await makeUser({ username: 'jiro_26' });
    const parent = await makePost({ authorId: hana.id });
    const quoted = await makePost({ authorId: jiro.id });
    const own = await makePost({ authorId: me.id });
    signInAs(me);
    const reply = await createPost('返信', { replyToId: parent.id });
    const quote = await createPost('引用', { quoteOfId: quoted.id });
    const mention = await createPost('@hana_26 @jiro_26 @me_26 @nobody_26 こんにちは');
    await createPost('自分への返信', { replyToId: own.id });
    if (!reply.ok || !quote.ok || !mention.ok) throw new Error('not created');
    const sorted = (await notes()).sort(
      (a, b) => a.type.localeCompare(b.type) || a.recipientId.localeCompare(b.recipientId),
    );
    expect(sorted).toEqual(
      [
        { recipientId: hana.id, actorId: me.id, type: 'mention', postId: BigInt(mention.id) },
        { recipientId: jiro.id, actorId: me.id, type: 'mention', postId: BigInt(mention.id) },
        { recipientId: jiro.id, actorId: me.id, type: 'quote', postId: BigInt(quote.id) },
        { recipientId: hana.id, actorId: me.id, type: 'reply', postId: BigInt(reply.id) },
      ].sort((a, b) => a.type.localeCompare(b.type) || a.recipientId.localeCompare(b.recipientId)),
    );
  });

  it('自分の投稿を引用しても、通知はできない（#30）', async () => {
    const me = await makeUser();
    const own = await makePost({ authorId: me.id });
    signInAs(me);
    expect((await createPost('自分を引用', { quoteOfId: own.id })).ok).toBe(true);
    expect(await notes()).toEqual([]);
  });
});
