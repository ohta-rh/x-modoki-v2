import { makeFollow, makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newId } from '@/shared/lib/id';
import { countNewPosts } from './count-new-posts';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const T0 = Date.UTC(2026, 10, 19);
const at = (minute: number) => newId({ now: T0 + minute * 60_000, random: 0 });

describe('countNewPosts（#28、フォロー中の新しい投稿の数）', () => {
  it('ログインが無ければ UNAUTHORIZED', async () => {
    expect(await countNewPosts(at(0))).toEqual({ ok: false, error: 'UNAUTHORIZED' });
  });

  it('いま見ている先頭より新しい、フォローしている人の、返信でない・削除されていない投稿を数える。自分の投稿は数えない', async () => {
    const me = await makeUser();
    const friend = await makeUser();
    const stranger = await makeUser();
    await makeFollow(me.id, friend.id);
    const newest = await makePost({ id: at(1), authorId: friend.id, text: '見ている先頭' });
    await makePost({ id: at(2), authorId: friend.id, text: '新しい 1' });
    await makePost({ id: at(3), authorId: friend.id, text: '新しい 2' });
    await makePost({ id: at(4), authorId: me.id, text: '自分の' });
    await makePost({ id: at(5), authorId: stranger.id, text: '知らない人' });
    await makePost({
      id: at(6),
      authorId: friend.id,
      text: '返信',
      replyToId: newest.id,
      rootId: newest.id,
    });
    await makePost({ id: at(7), authorId: friend.id, text: '削除済み', deletedAt: new Date() });
    signInAs(me);
    expect(await countNewPosts(newest.id)).toEqual({ ok: true, count: 2 });
  });
});
