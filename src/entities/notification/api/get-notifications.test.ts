import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifications } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { getNotifications } from './get-notifications';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('getNotifications（#26）', () => {
  it('自分宛てだけを新しい順に、相手と投稿と既読かどうかを付けて返す', async () => {
    const me = await makeUser({ username: 'me_n', name: '私' });
    const hana = await makeUser({ username: 'hana_n', name: '花子' });
    const mine = await makePost({ authorId: me.id, text: 'いいねされた' });
    const theirs = await makePost({ authorId: hana.id, text: '@me_n こんにちは' });
    // Ids made in one millisecond order by their random part: sort them, so ids[1] is newer.
    const ids = [newId(), newId(), newId()].sort((a, b) => (a < b ? -1 : 1));
    await testDb()
      .insert(notifications)
      .values([
        { id: ids[0], recipientId: me.id, actorId: hana.id, type: 'like', postId: mine.id },
        {
          id: ids[1],
          recipientId: me.id,
          actorId: hana.id,
          type: 'mention',
          postId: theirs.id,
          readAt: new Date(),
        },
        { id: ids[2], recipientId: hana.id, actorId: me.id, type: 'follow', postId: null },
      ]);
    expect(await getNotifications('all', null)).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    signInAs(me);
    const result = await getNotifications('all', null);
    if (!result.ok) throw new Error(result.error);
    expect(result.page.nextCursor).toBeNull();
    expect(result.page.items.map((item) => ({ ...item, createdAt: undefined }))).toEqual([
      {
        id: ids[1].toString(),
        type: 'mention',
        createdAt: undefined,
        read: true,
        actor: { username: 'hana_n', name: '花子', avatarUrl: null },
        post: { id: theirs.id.toString(), text: '@me_n こんにちは', authorUsername: 'hana_n' },
      },
      {
        id: ids[0].toString(),
        type: 'like',
        createdAt: undefined,
        read: false,
        actor: { username: 'hana_n', name: '花子', avatarUrl: null },
        post: { id: mine.id.toString(), text: 'いいねされた', authorUsername: 'me_n' },
      },
    ]);
  });

  it('20 件ずつ、カーソルで続きを返す。「メンション」はメンションと返信だけ', async () => {
    const me = await makeUser();
    const them = await makeUser();
    const post = await makePost({ authorId: them.id });
    const people = await Promise.all(Array.from({ length: 21 }, () => makeUser()));
    // Ids made in one millisecond order by their random part: sort them, the reply newest.
    const ids = Array.from({ length: 22 }, () => newId()).sort((a, b) => (a < b ? -1 : 1));
    await testDb()
      .insert(notifications)
      .values([
        ...people.map((person, i) => ({
          id: ids[i],
          recipientId: me.id,
          actorId: person.id,
          type: 'follow' as const,
          postId: null,
        })),
        { id: ids[21], recipientId: me.id, actorId: them.id, type: 'reply', postId: post.id },
      ]);
    signInAs(me);
    const first = await getNotifications('all', null);
    if (!first.ok) throw new Error(first.error);
    expect(first.page.items).toHaveLength(20);
    expect(first.page.items[0].type).toBe('reply');
    const second = await getNotifications('all', first.page.nextCursor);
    if (!second.ok) throw new Error(second.error);
    expect(second.page.items).toHaveLength(2);
    expect(second.page.nextCursor).toBeNull();
    const mentions = await getNotifications('mentions', null);
    if (!mentions.ok) throw new Error(mentions.error);
    expect(mentions.page.items.map((item) => item.type)).toEqual(['reply']);
    expect(await getNotifications('all', 'nope')).toEqual({ ok: false, error: 'BAD_CURSOR' });
  });
});
