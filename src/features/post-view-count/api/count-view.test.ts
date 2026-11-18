import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { posts } from '@/shared/db';
import { countView } from './count-view';

setupTestDb();

const views = async (id: bigint) =>
  (await testDb().select().from(posts).where(eq(posts.id, id)))[0].viewCount;

describe('countView（#21）', () => {
  // FR-REACT-06: 表示の回数
  it('表示の回数を 1 足す。削除された投稿は足さない（ログインは要らない）', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    const gone = await makePost({ authorId: me.id, deletedAt: new Date() });
    await countView(post.id);
    await countView(post.id);
    await countView(gone.id);
    expect(await views(post.id)).toBe(2);
    expect(await views(gone.id)).toBe(0);
  });
});
