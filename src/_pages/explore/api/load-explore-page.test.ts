import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { describe, expect, it, vi } from 'vitest';
import { hashtags, postHashtags } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { loadExplorePage } from './load-explore-page';

vi.mock('next/server', () => ({ connection: async () => undefined }));

setupTestDb();

describe('loadExplorePage（#27）', () => {
  it('トレンドを返す', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    const [tag] = await testDb().insert(hashtags).values({ id: newId(), tag: '海' }).returning();
    await testDb().insert(postHashtags).values({ postId: post.id, hashtagId: tag.id });
    expect(await loadExplorePage()).toEqual({ trends: [{ tag: '海', count: 1 }] });
  });
});
