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

// docs/architecture/data-model.md 2 and ADR-0034, written from the documents (not read back from the
// database): every primary key, foreign key with its ON DELETE, CHECK and UNIQUE constraint.
const CONSTRAINTS: Array<[table: string, definition: string]> = [
  ['accounts', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['accounts', 'PRIMARY KEY (id)'],
  ['bookmarks', 'FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE'],
  ['bookmarks', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['bookmarks', 'PRIMARY KEY (user_id, post_id)'],
  ['follows', 'CHECK ((follower_id <> followee_id))'],
  ['follows', 'FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['follows', 'FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['follows', 'PRIMARY KEY (follower_id, followee_id)'],
  ['hashtags', 'PRIMARY KEY (id)'],
  ['hashtags', 'UNIQUE (tag)'],
  ['likes', 'FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE'],
  ['likes', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['likes', 'PRIMARY KEY (user_id, post_id)'],
  ['media', 'FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['media', 'PRIMARY KEY (id)'],
  ['media', 'UNIQUE (key)'],
  ['mentions', 'FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE'],
  ['mentions', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['mentions', 'PRIMARY KEY (post_id, user_id)'],
  ['notifications', 'FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['notifications', 'FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE'],
  ['notifications', 'FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['notifications', 'PRIMARY KEY (id)'],
  ['notifications', 'UNIQUE NULLS NOT DISTINCT (recipient_id, actor_id, type, post_id)'],
  ['post_hashtags', 'FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE'],
  ['post_hashtags', 'FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE'],
  ['post_hashtags', 'PRIMARY KEY (post_id, hashtag_id)'],
  ['post_media', 'CHECK ((("position" >= 0) AND ("position" <= 3)))'],
  ['post_media', 'FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE'],
  ['post_media', 'FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE'],
  ['post_media', 'PRIMARY KEY (post_id, "position")'],
  ['post_media', 'UNIQUE (media_id)'],
  [
    'posts',
    "CHECK (((repost_of_id IS NULL) OR ((text = ''::text) AND (reply_to_id IS NULL) AND (quote_of_id IS NULL))))",
  ],
  ['posts', 'FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['posts', 'FOREIGN KEY (quote_of_id) REFERENCES posts(id) ON DELETE SET NULL'],
  ['posts', 'FOREIGN KEY (reply_to_id) REFERENCES posts(id) ON DELETE SET NULL'],
  ['posts', 'FOREIGN KEY (repost_of_id) REFERENCES posts(id) ON DELETE CASCADE'],
  ['posts', 'FOREIGN KEY (root_id) REFERENCES posts(id) ON DELETE SET NULL'],
  ['posts', 'PRIMARY KEY (id)'],
  ['rate_limits', 'PRIMARY KEY (key, window_start)'],
  ['sessions', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['sessions', 'PRIMARY KEY (id)'],
  ['sessions', 'UNIQUE (token)'],
  ['users', 'PRIMARY KEY (id)'],
  ['users', 'UNIQUE (email)'],
  ['verifications', 'PRIMARY KEY (id)'],
];

// Columns per table (data-model.md 2; the Better Auth columns from docs/research/better-auth-on-next-16.md).
const COLUMNS: Record<string, string> = {
  accounts:
    'id user_id account_id provider_id access_token refresh_token id_token access_token_expires_at refresh_token_expires_at scope password created_at updated_at',
  bookmarks: 'user_id post_id created_at',
  follows: 'follower_id followee_id created_at',
  hashtags: 'id tag',
  likes: 'user_id post_id created_at',
  media: 'id owner_id key mime width height alt status created_at',
  mentions: 'post_id user_id',
  notifications: 'id recipient_id actor_id type post_id read_at created_at',
  post_hashtags: 'post_id hashtag_id created_at',
  post_media: 'post_id media_id position',
  posts:
    'id author_id text reply_to_id root_id quote_of_id repost_of_id reply_count repost_count quote_count like_count bookmark_count view_count created_at deleted_at',
  rate_limits: 'key window_start count',
  sessions: 'id user_id token expires_at ip_address user_agent created_at updated_at',
  users:
    'id email email_verified name username display_username image banner bio location website pinned_post_id followers_count following_count posts_count theme accent created_at updated_at',
  verifications: 'id identifier value expires_at created_at updated_at',
};

describe('列と制約がデータモデルの 2 節と ADR-0034 のとおりにある', () => {
  it('主キー・外部キー（消したときの振る舞いも）・CHECK・一意の制約が、過不足なくある', async () => {
    const { rows } = await testDb().execute<{ tbl: string; def: string }>(sql`
      SELECT conrelid::regclass::text AS tbl, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace AND contype IN ('p', 'f', 'c', 'u')`);
    const actual = rows.map((row) => `${row.tbl} | ${row.def}`).sort();
    expect(actual).toEqual(CONSTRAINTS.map(([table, def]) => `${table} | ${def}`).sort());
  });

  it.each(Object.entries(COLUMNS))('%s の列', async (table, columns) => {
    const { rows } = await testDb().execute<{ column_name: string }>(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}`);
    expect(rows.map((row) => row.column_name).sort()).toEqual(columns.split(' ').sort());
  });
});
