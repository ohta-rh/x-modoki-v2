import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { makeUpload } from '@test/uploads';
import { currentSession, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashtags, postHashtags, postMedia } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { searchPosts } from './search-posts';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const texts = (result: Awaited<ReturnType<typeof searchPosts>>) => {
  if (!result.ok) throw new Error(result.error);
  return result.page.items.map((item) => item.text);
};

describe('searchPosts（#27、data-model.md の 4 節）', () => {
  it('話題は本文に含む投稿をいいねの多い順、最新は新しい順。消した投稿は出ない', async () => {
    const me = await makeUser();
    await makePost({ authorId: me.id, text: 'りんごの話 1', likeCount: 1 });
    await makePost({ authorId: me.id, text: 'りんごの話 2', likeCount: 5 });
    await makePost({ authorId: me.id, text: 'りんごの話 3', likeCount: 3 });
    await makePost({ authorId: me.id, text: 'りんごの話 消した', deletedAt: new Date() });
    await makePost({ authorId: me.id, text: 'みかんの話' });
    expect(texts(await searchPosts('りんご', 'top', null))).toEqual([
      'りんごの話 2',
      'りんごの話 3',
      'りんごの話 1',
    ]);
    expect(texts(await searchPosts('りんごの', 'live', null))).toEqual([
      'りんごの話 3',
      'りんごの話 2',
      'りんごの話 1',
    ]);
  });

  it('英語は大文字と小文字を区別しない。% と _ は文字として扱う', async () => {
    const me = await makeUser();
    await makePost({ authorId: me.id, text: 'Hello World' });
    await makePost({ authorId: me.id, text: '100% sure' });
    await makePost({ authorId: me.id, text: '100 sure' });
    await makePost({ authorId: me.id, text: 'a_b' });
    await makePost({ authorId: me.id, text: 'axb' });
    expect(texts(await searchPosts('hello', 'live', null))).toEqual(['Hello World']);
    expect(texts(await searchPosts('0%', 'live', null))).toEqual(['100% sure']);
    expect(texts(await searchPosts('a_b', 'live', null))).toEqual(['a_b']);
  });

  it('# で始まる語は、ハッシュタグの完全一致で引く（大文字と小文字は区別しない）', async () => {
    const me = await makeUser();
    const tagged = await makePost({ authorId: me.id, text: '#猫 の写真' });
    await makePost({ authorId: me.id, text: '#猫好き の話' });
    await makePost({ authorId: me.id, text: '猫の話（タグ無し）' });
    const [tag] = await testDb().insert(hashtags).values({ id: newId(), tag: '猫' }).returning();
    await testDb().insert(postHashtags).values({ postId: tagged.id, hashtagId: tag.id });
    const english = await makePost({ authorId: me.id, text: '#Cats' });
    const [cats] = await testDb().insert(hashtags).values({ id: newId(), tag: 'cats' }).returning();
    await testDb().insert(postHashtags).values({ postId: english.id, hashtagId: cats.id });
    expect(texts(await searchPosts('#猫', 'live', null))).toEqual(['#猫 の写真']);
    expect(texts(await searchPosts('#CATS', 'live', null))).toEqual(['#Cats']);
  });

  it('メディアは画像のある投稿だけ', async () => {
    const me = await makeUser();
    const pictured = await makePost({ authorId: me.id, text: '写真つきの海' });
    await makePost({ authorId: me.id, text: '写真なしの海' });
    const upload = await makeUpload(me.id, { put: false });
    await testDb()
      .insert(postMedia)
      .values({ postId: pictured.id, mediaId: upload.id, position: 0 });
    expect(texts(await searchPosts('の海', 'media', null))).toEqual(['写真つきの海']);
  });

  it('20 件ずつ、カーソルで続きを返す（話題も最新も）。壊れたカーソルは BAD_CURSOR', async () => {
    const me = await makeUser();
    for (let i = 0; i < 22; i += 1) {
      await makePost({ authorId: me.id, text: `続きの検索 ${i}`, likeCount: i % 3 });
    }
    for (const tab of ['top', 'live'] as const) {
      const first = await searchPosts('続きの検索', tab, null);
      if (!first.ok) throw new Error(first.error);
      expect(first.page.items).toHaveLength(20);
      const second = await searchPosts('続きの検索', tab, first.page.nextCursor);
      if (!second.ok) throw new Error(second.error);
      expect(second.page.nextCursor).toBeNull();
      const all = [...first.page.items, ...second.page.items].map((item) => item.id);
      expect(new Set(all).size).toBe(22);
    }
    expect(await searchPosts('続き', 'top', 'nope')).toEqual({ ok: false, error: 'BAD_CURSOR' });
    expect(await searchPosts('続き', 'live', 'nope')).toEqual({ ok: false, error: 'BAD_CURSOR' });
  });
});
