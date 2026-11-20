import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashtags, postHashtags } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { loadSidebar } from './load-sidebar';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));
vi.mock('next/server', () => ({ connection: async () => undefined }));

setupTestDb();
beforeEach(signOut);

describe('loadSidebar（#27）', () => {
  it('トレンドとおすすめのユーザーを一緒に返す', async () => {
    const hana = await makeUser({ username: 'hana_sb', followersCount: 5 });
    const post = await makePost({ authorId: hana.id });
    const [tag] = await testDb().insert(hashtags).values({ id: newId(), tag: '猫' }).returning();
    await testDb().insert(postHashtags).values({ postId: post.id, hashtagId: tag.id });
    const data = await loadSidebar();
    expect(data.trends).toEqual([{ tag: '猫', count: 1 }]);
    expect(data.suggestions.map((person) => person.username)).toEqual(['hana_sb']);
  });
});
