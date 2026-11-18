import { makePost, makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { describe, expect, it } from 'vitest';
import { hashtags, postHashtags } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { getTrends } from './get-trends';

setupTestDb();

const NOW = new Date('2026-11-18T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3600_000);

async function tagged(
  tag: string,
  count: number,
  options: { hours?: number; deleted?: boolean } = {},
) {
  const me = await makeUser();
  const [row] = await testDb()
    .insert(hashtags)
    .values({ id: newId(), tag })
    .onConflictDoUpdate({ target: hashtags.tag, set: { tag } })
    .returning();
  for (let i = 0; i < count; i += 1) {
    const post = await makePost({
      authorId: me.id,
      createdAt: hoursAgo(options.hours ?? 1),
      deletedAt: options.deleted ? NOW : null,
    });
    await testDb().insert(postHashtags).values({ postId: post.id, hashtagId: row.id });
  }
}

describe('getTrends（#27）', () => {
  // FR-SEARCH-06: トレンド
  it('直近 24 時間のハッシュタグを、投稿の数の多い順に 10 件、数と一緒に返す。古い投稿と消した投稿は数えない', async () => {
    await tagged('猫', 3);
    await tagged('犬', 5);
    await tagged('鳥', 2);
    await tagged('猫', 4, { hours: 30 });
    await tagged('鳥', 4, { deleted: true });
    for (let i = 0; i < 9; i += 1) await tagged(`その他${i}`, 1);
    const trends = await getTrends(NOW);
    expect(trends).toHaveLength(10);
    expect(trends.slice(0, 3)).toEqual([
      { tag: '犬', count: 5 },
      { tag: '猫', count: 3 },
      { tag: '鳥', count: 2 },
    ]);
  });

  it('日時を渡さなければ、今から 24 時間を数える', async () => {
    const me = await makeUser();
    const post = await makePost({ authorId: me.id });
    const [row] = await testDb().insert(hashtags).values({ id: newId(), tag: '今' }).returning();
    await testDb().insert(postHashtags).values({ postId: post.id, hashtagId: row.id });
    expect(await getTrends()).toEqual([{ tag: '今', count: 1 }]);
  });
});
