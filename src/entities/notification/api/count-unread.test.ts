import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifications } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { countUnread } from './count-unread';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('countUnread（#26）', () => {
  it('自分宛ての未読だけを数える。ログインしていなければ 0', async () => {
    const [me, them, other] = [await makeUser(), await makeUser(), await makeUser()];
    const post = await makePost({ authorId: me.id });
    await testDb()
      .insert(notifications)
      .values([
        { id: newId(), recipientId: me.id, actorId: them.id, type: 'like', postId: post.id },
        { id: newId(), recipientId: me.id, actorId: other.id, type: 'like', postId: post.id },
        {
          id: newId(),
          recipientId: me.id,
          actorId: them.id,
          type: 'follow',
          postId: null,
          readAt: new Date(),
        },
        { id: newId(), recipientId: them.id, actorId: me.id, type: 'follow', postId: null },
      ]);
    expect(await countUnread()).toBe(0);
    signInAs(me);
    expect(await countUnread()).toBe(2);
  });
});
