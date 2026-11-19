import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifications, posts, user } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { deletePost } from './delete-post';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const row = async (id: bigint) => (await testDb().select().from(posts).where(eq(posts.id, id)))[0];

describe('deletePost（NFR-SEC-01、T-01）', () => {
  it('本人: deleted_at を入れ、作者の投稿の数を 1 減らす', async () => {
    const me = await makeUser({ postsCount: 1 });
    const post = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await deletePost(post.id)).toEqual({ ok: true });
    expect((await row(post.id)).deletedAt).toBeInstanceOf(Date);
    expect((await testDb().select().from(user).where(eq(user.id, me.id)))[0].postsCount).toBe(0);
  });

  // NFR-SEC-01: 全ての Server Action と、ログインが要る全ての Route Handler が、`api` セグメントで認証と認可を行う。ログインしていなければ `UNAUTHORIZED`、他人のものへの変更は `FORBIDDEN`。`proxy.ts` の確認だけに頼らない
  // AUTHZ: deletePost FORBIDDEN
  it('他人: FORBIDDEN で、データが変わらない', async () => {
    const owner = await makeUser();
    const post = await makePost({ authorId: owner.id });
    signInAs(await makeUser());
    expect(await deletePost(post.id)).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect((await row(post.id)).deletedAt).toBeNull();
  });

  // AUTHZ: deletePost UNAUTHORIZED
  it('ログイン無し: UNAUTHORIZED で、データが変わらない', async () => {
    const post = await makePost({ authorId: (await makeUser()).id });
    expect(await deletePost(post.id)).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect((await row(post.id)).deletedAt).toBeNull();
  });

  it('無い投稿と、削除済みの投稿は NOT_FOUND', async () => {
    const me = await makeUser();
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    signInAs(me);
    expect(await deletePost(newId())).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await deletePost(gone.id)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('返信を消すと相手の返信の数を 1 減らし、0 より小さくしない', async () => {
    const me = await makeUser();
    const parent = await makePost({ authorId: me.id, replyCount: 1 });
    const reply = await makePost({ authorId: me.id, replyToId: parent.id, rootId: parent.id });
    const orphan = await makePost({ authorId: me.id, replyToId: parent.id, rootId: parent.id });
    signInAs(me);
    await deletePost(reply.id);
    expect((await row(parent.id)).replyCount).toBe(0);
    await deletePost(orphan.id);
    expect((await row(parent.id)).replyCount).toBe(0);
  });

  it('同じ投稿を同時に何回消しても、数は 1 だけ減り、ほかは NOT_FOUND（#20 のレビュー）', async () => {
    const me = await makeUser();
    await testDb().update(user).set({ postsCount: 5 }).where(eq(user.id, me.id));
    const parent = await makePost({ authorId: me.id, replyCount: 5 });
    const reply = await makePost({ authorId: me.id, replyToId: parent.id, rootId: parent.id });
    signInAs(me);
    const results = await Promise.all(Array.from({ length: 5 }, () => deletePost(reply.id)));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect((await row(parent.id)).replyCount).toBe(4);
    const [author] = await testDb().select().from(user).where(eq(user.id, me.id));
    expect(author.postsCount).toBe(4);
  });
});

describe('deletePost の通知（#26）', () => {
  it('消した投稿についての通知（それへの反応も、それが知らせたものも）を消し、ほかは残す', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    const doomed = await makePost({ authorId: me.id });
    const kept = await makePost({ authorId: me.id });
    await testDb()
      .insert(notifications)
      .values([
        { id: newId(), recipientId: me.id, actorId: them.id, type: 'like', postId: doomed.id },
        { id: newId(), recipientId: them.id, actorId: me.id, type: 'mention', postId: doomed.id },
        { id: newId(), recipientId: me.id, actorId: them.id, type: 'like', postId: kept.id },
        { id: newId(), recipientId: me.id, actorId: them.id, type: 'follow', postId: null },
      ]);
    signInAs(me);
    await deletePost(doomed.id);
    const left = await testDb().select({ postId: notifications.postId }).from(notifications);
    expect(left.map((row) => row.postId).sort()).toEqual([kept.id, null].sort());
  });
});
