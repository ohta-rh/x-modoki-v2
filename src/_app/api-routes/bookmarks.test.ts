import { makePost, makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setBookmarkAction } from '@/features/post-bookmark/index.server';
import { getBookmarkList } from './bookmarks';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const get = (query = '') =>
  getBookmarkList(new Request(`http://localhost:3000/api/bookmarks${query}`));

describe('GET /api/bookmarks（#21）', () => {
  it('自分のブックマークを items と nextCursor の JSON で返す。空のカーソルは最初のページ', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id, text: '取っておく' });
    signInAs(me);
    await setBookmarkAction(post.id.toString(), true);
    const response = await get('?cursor=');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items.map((item: { text: string }) => item.text)).toEqual(['取っておく']);
    expect(body.nextCursor).toBeNull();
  });

  // AUTHZ: getBookmarkList UNAUTHORIZED
  it('ログイン無しは 401、形の違うカーソルは 400', async () => {
    expect((await get()).status).toBe(401);
    signInAs(await makeUser());
    expect((await get('?cursor=x')).status).toBe(400);
  });
});
