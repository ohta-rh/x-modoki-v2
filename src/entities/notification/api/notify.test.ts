import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { describe, expect, it } from 'vitest';
import { notifications } from '@/shared/db';
import { notify, unnotify } from './notify';

setupTestDb();

const rows = () =>
  testDb()
    .select({
      recipientId: notifications.recipientId,
      actorId: notifications.actorId,
      type: notifications.type,
      postId: notifications.postId,
    })
    .from(notifications);

describe('notify・unnotify（#26、data-model.md の notifications）', () => {
  // FR-NOTIF-02: 繰り返しと取り消し
  it('相手への通知の行を作る。同じ人・種類・投稿は繰り返しても 1 行', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    const post = await makePost({ authorId: them.id });
    const n = { recipientId: them.id, actorId: me.id, type: 'like', postId: post.id } as const;
    await testDb().transaction((tx) => notify(tx, [n]));
    await testDb().transaction((tx) => notify(tx, [n]));
    expect(await rows()).toEqual([n]);
  });

  it('自分への操作では作らない。フォローは投稿が無くても 1 行', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    const post = await makePost({ authorId: me.id });
    const follow = { recipientId: them.id, actorId: me.id, type: 'follow', postId: null } as const;
    await testDb().transaction((tx) =>
      notify(tx, [
        { recipientId: me.id, actorId: me.id, type: 'like', postId: post.id },
        follow,
        follow,
      ]),
    );
    expect(await rows()).toEqual([follow]);
  });

  it('何も無ければ何もしない', async () => {
    await testDb().transaction((tx) => notify(tx, []));
    expect(await rows()).toEqual([]);
  });

  it('取り消すと、その行を消す（ほかの行は残す）', async () => {
    const [me, them, other] = [await makeUser(), await makeUser(), await makeUser()];
    const post = await makePost({ authorId: them.id });
    const mine = { recipientId: them.id, actorId: me.id, type: 'like', postId: post.id } as const;
    const theirs = { ...mine, actorId: other.id };
    await testDb().transaction((tx) => notify(tx, [mine, theirs]));
    await testDb().transaction((tx) => unnotify(tx, mine));
    expect(await rows()).toEqual([theirs]);
    const follow = { recipientId: them.id, actorId: me.id, type: 'follow', postId: null } as const;
    await testDb().transaction((tx) => notify(tx, [follow]));
    await testDb().transaction((tx) => unnotify(tx, follow));
    expect(await rows()).toEqual([theirs]);
  });
});
