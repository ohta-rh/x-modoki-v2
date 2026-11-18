import { makePost, makeUser } from '@test/factories';
import { testDb, setupTestDb } from '@test/db';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { newId } from '@/shared/lib/id';
import { getDb } from './client';
import { follows, posts } from './schema';

setupTestDb();

const violation = (constraint: string) => ({ cause: { constraint } });

describe('表の制約（docs/architecture/data-model.md）', () => {
  it('自分をフォローすると制約で拒まれる', async () => {
    const me = await makeUser();
    await expect(
      getDb().insert(follows).values({ followerId: me.id, followeeId: me.id }),
    ).rejects.toMatchObject(violation('follows_not_self'));
  });

  it('同じ人が同じ投稿を 2 回リポストすると、一意の索引で拒まれる', async () => {
    const me = await makeUser();
    const original = await makePost({ authorId: me.id });
    await makePost({ authorId: me.id, text: '', repostOfId: original.id });
    await expect(
      getDb()
        .insert(posts)
        .values({ id: newId(), authorId: me.id, text: '', repostOfId: original.id }),
    ).rejects.toMatchObject(violation('posts_one_repost_per_author_idx'));
  });

  it('別の人なら、同じ投稿をリポストできる', async () => {
    const original = await makePost({ authorId: (await makeUser()).id });
    await makePost({ authorId: (await makeUser()).id, text: '', repostOfId: original.id });
    await makePost({ authorId: (await makeUser()).id, text: '', repostOfId: original.id });
  });

  it.each([
    ['本文がある', { text: 'ひとこと' }],
    ['返信を兼ねる', { replyToIdOf: true }],
    ['引用を兼ねる', { quoteOfIdOf: true }],
  ])('リポストが%sと、CHECK で拒まれる', async (_, shape) => {
    const me = await makeUser();
    const original = await makePost({ authorId: me.id });
    await expect(
      getDb()
        .insert(posts)
        .values({
          id: newId(),
          authorId: me.id,
          text: 'text' in shape ? shape.text : '',
          repostOfId: original.id,
          replyToId: 'replyToIdOf' in shape ? original.id : null,
          quoteOfId: 'quoteOfIdOf' in shape ? original.id : null,
        }),
    ).rejects.toMatchObject(violation('posts_repost_is_bare'));
  });
});

describe('表と索引がデータモデルの 2・3 節のとおりにある', () => {
  it('全ての表がある', async () => {
    const { rows } = await testDb().execute<{ tablename: string }>(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    expect(rows.map((row) => row.tablename)).toEqual([
      'accounts',
      'bookmarks',
      'follows',
      'hashtags',
      'likes',
      'media',
      'mentions',
      'notifications',
      'post_hashtags',
      'post_media',
      'posts',
      'rate_limits',
      'sessions',
      'users',
      'verifications',
    ]);
  });

  it.each([
    ['posts', 'posts_author_id_idx', 'btree (author_id, id DESC)'],
    [
      'posts',
      'posts_recommended_idx',
      'btree (id DESC) WHERE ((reply_to_id IS NULL) AND (deleted_at IS NULL))',
    ],
    ['posts', 'posts_reply_to_id_idx', 'btree (reply_to_id, id)'],
    ['posts', 'posts_root_id_idx', 'btree (root_id, id)'],
    ['posts', 'posts_text_trgm_idx', 'gin (text gin_trgm_ops)'],
    [
      'users',
      'users_username_lower_idx',
      'UNIQUE INDEX users_username_lower_idx ON public.users USING btree (lower(username))',
    ],
    [
      'users',
      'users_search_trgm_idx',
      "gin ((((name || ' '::text) || COALESCE(username, ''::text))) gin_trgm_ops)",
    ],
    ['follows', 'follows_followee_idx', 'btree (followee_id, follower_id)'],
    ['likes', 'likes_post_id_idx', 'btree (post_id)'],
    ['likes', 'likes_user_created_idx', 'btree (user_id, created_at DESC)'],
    ['bookmarks', 'bookmarks_user_created_idx', 'btree (user_id, created_at DESC)'],
    ['notifications', 'notifications_recipient_idx', 'btree (recipient_id, id DESC)'],
    ['notifications', 'notifications_unread_idx', 'btree (recipient_id) WHERE (read_at IS NULL)'],
    ['post_hashtags', 'post_hashtags_hashtag_idx', 'btree (hashtag_id, post_id DESC)'],
    ['post_hashtags', 'post_hashtags_created_at_idx', 'btree (created_at)'],
    ['media', 'media_status_created_at_idx', 'btree (status, created_at)'],
  ])('%s の %s', async (table, name, definition) => {
    const { rows } = await testDb().execute<{ indexdef: string }>(
      sql`SELECT indexdef FROM pg_indexes WHERE tablename = ${table} AND indexname = ${name}`,
    );
    expect(rows[0]?.indexdef).toContain(definition);
  });

  it('pg_trgm の拡張がある', async () => {
    const { rows } = await testDb().execute(
      sql`SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'`,
    );
    expect(rows).toHaveLength(1);
  });
});
