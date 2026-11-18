import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifications } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { markNotificationsReadAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('markNotificationsReadAction（#26）', () => {
  it('出ている通知（その ID まで）だけを既読にする。あとから届いたものと他人のものは未読のまま', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    const ids = Array.from({ length: 3 }, () => newId()).sort((a, b) => (a < b ? -1 : 1));
    await testDb()
      .insert(notifications)
      .values([
        { id: ids[0], recipientId: me.id, actorId: them.id, type: 'follow', postId: null },
        { id: ids[1], recipientId: them.id, actorId: me.id, type: 'follow', postId: null },
        { id: ids[2], recipientId: me.id, actorId: them.id, type: 'mention', postId: null },
      ]);
    signInAs(me);
    expect(await markNotificationsReadAction(ids[1].toString())).toEqual({ ok: true });
    const rows = await testDb().select().from(notifications);
    const read = (id: bigint) => rows.find((row) => row.id === id)!.readAt !== null;
    expect([read(ids[0]), read(ids[1]), read(ids[2])]).toEqual([true, false, false]);
  });

  it('ログインしていない・形の違う ID は何もしない', async () => {
    expect(await markNotificationsReadAction('1')).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    signInAs(await makeUser());
    expect(await markNotificationsReadAction('abc')).toEqual({ ok: false, error: 'VALIDATION' });
    expect(await markNotificationsReadAction(12)).toEqual({ ok: false, error: 'VALIDATION' });
  });
});
