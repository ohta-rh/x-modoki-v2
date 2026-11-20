import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { user } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { setPinAction } from './actions';
import { setPin } from './set-pin';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const pinned = async (id: string) =>
  (await testDb().select().from(user).where(eq(user.id, id)))[0].pinnedPostId;

describe('setPin（#23）', () => {
  // FR-PROF-07: 固定した投稿
  it('自分の投稿を固定でき、固定は 1 つだけ（新しく固定すると入れ替わる）。外すと無くなる', async () => {
    const me = await makeUser();
    const a = await makePost({ authorId: me.id });
    const b = await makePost({ authorId: me.id });
    signInAs(me);
    expect(await setPin(a.id, true)).toEqual({ ok: true });
    expect(await pinned(me.id)).toBe(a.id);
    expect(await setPin(b.id, true)).toEqual({ ok: true });
    expect(await pinned(me.id)).toBe(b.id);
    // Unpinning a post that is not the pinned one leaves the pin alone.
    expect(await setPin(a.id, false)).toEqual({ ok: true });
    expect(await pinned(me.id)).toBe(b.id);
    expect(await setPin(b.id, false)).toEqual({ ok: true });
    expect(await pinned(me.id)).toBeNull();
  });

  // AUTHZ: setPin UNAUTHORIZED
  // AUTHZ: setPin FORBIDDEN
  it('他人の投稿は FORBIDDEN、ログイン無しは UNAUTHORIZED、無い・削除済み・リポストの行は NOT_FOUND', async () => {
    const me = await makeUser();
    const other = await makeUser();
    const theirs = await makePost({ authorId: other.id });
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    const repost = await makePost({ authorId: me.id, text: '', repostOfId: theirs.id });
    expect(await setPin(theirs.id, true)).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    signInAs(me);
    expect(await setPin(theirs.id, true)).toEqual({ ok: false, error: 'FORBIDDEN' });
    for (const id of [gone.id, repost.id, newId()]) {
      expect(await setPin(id, true)).toEqual({ ok: false, error: 'NOT_FOUND' });
    }
    expect(await pinned(me.id)).toBeNull();
  });
});

describe('setPinAction（#23）', () => {
  it('固定して ok、失敗はコードと文言', async () => {
    const me = await makeUser();
    const mine = await makePost({ authorId: me.id });
    const theirs = await makePost({ authorId: (await makeUser()).id });
    signInAs(me);
    expect(await setPinAction(mine.id.toString(), true)).toEqual({ ok: true });
    expect(await setPinAction(theirs.id.toString(), true)).toEqual({
      ok: false,
      code: 'FORBIDDEN',
      message: 'この投稿は固定できません',
    });
    expect(await setPinAction('abc', true)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
      message: 'この投稿は見つかりません',
    });
    signOut();
    expect(await setPinAction(mine.id.toString(), true)).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'ログインしてください',
    });
  });
});
