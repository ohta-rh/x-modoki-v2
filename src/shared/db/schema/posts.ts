// Posts, media, reactions, follows, hashtags, mentions (docs/architecture/data-model.md 2–3).
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth.ts';
import { at, id64 } from './columns.ts';

const userRef = (name: string) =>
  text(name)
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' });

export const posts = pgTable(
  'posts',
  {
    id: id64('id').primaryKey(),
    authorId: userRef('author_id'),
    text: text('text').notNull().default(''),
    replyToId: id64('reply_to_id').references((): AnyPgColumn => posts.id, {
      onDelete: 'set null',
    }),
    rootId: id64('root_id').references((): AnyPgColumn => posts.id, { onDelete: 'set null' }),
    quoteOfId: id64('quote_of_id').references((): AnyPgColumn => posts.id, {
      onDelete: 'set null',
    }),
    repostOfId: id64('repost_of_id').references((): AnyPgColumn => posts.id, {
      onDelete: 'cascade',
    }),
    replyCount: integer('reply_count').notNull().default(0),
    repostCount: integer('repost_count').notNull().default(0),
    quoteCount: integer('quote_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    bookmarkCount: integer('bookmark_count').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    createdAt: at('created_at').notNull().defaultNow(),
    deletedAt: at('deleted_at'),
  },
  (t) => [
    check(
      'posts_repost_is_bare',
      sql`${t.repostOfId} IS NULL OR (${t.text} = '' AND ${t.replyToId} IS NULL AND ${t.quoteOfId} IS NULL)`,
    ),
    uniqueIndex('posts_one_repost_per_author_idx')
      .on(t.authorId, t.repostOfId)
      .where(sql`${t.repostOfId} IS NOT NULL`),
    index('posts_author_id_idx').on(t.authorId, t.id.desc().nullsFirst()),
    index('posts_recommended_idx')
      .on(t.id.desc().nullsFirst())
      .where(sql`${t.replyToId} IS NULL AND ${t.deletedAt} IS NULL`),
    index('posts_reply_to_id_idx').on(t.replyToId, t.id),
    index('posts_root_id_idx').on(t.rootId, t.id),
    index('posts_text_trgm_idx').using('gin', t.text.op('gin_trgm_ops')),
  ],
);

export const media = pgTable(
  'media',
  {
    id: id64('id').primaryKey(),
    ownerId: userRef('owner_id'),
    key: text('key').notNull().unique(),
    mime: text('mime').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    alt: text('alt').notNull().default(''),
    status: text('status', { enum: ['pending', 'ready'] })
      .notNull()
      .default('pending'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [index('media_status_created_at_idx').on(t.status, t.createdAt)],
);

export const postMedia = pgTable(
  'post_media',
  {
    postId: id64('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    mediaId: id64('media_id')
      .notNull()
      .unique()
      .references(() => media.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.position] }),
    check('post_media_position_range', sql`${t.position} BETWEEN 0 AND 3`),
  ],
);

const postRef = (name: string) =>
  id64(name)
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' });

export const likes = pgTable(
  'likes',
  {
    userId: userRef('user_id'),
    postId: postRef('post_id'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.postId] }),
    index('likes_post_id_idx').on(t.postId),
    index('likes_user_created_idx').on(t.userId, t.createdAt.desc().nullsFirst()),
  ],
);

export const bookmarks = pgTable(
  'bookmarks',
  {
    userId: userRef('user_id'),
    postId: postRef('post_id'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.postId] }),
    index('bookmarks_user_created_idx').on(t.userId, t.createdAt.desc().nullsFirst()),
  ],
);

export const follows = pgTable(
  'follows',
  {
    followerId: userRef('follower_id'),
    followeeId: userRef('followee_id'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followeeId] }),
    check('follows_not_self', sql`${t.followerId} <> ${t.followeeId}`),
    index('follows_followee_idx').on(t.followeeId, t.followerId),
  ],
);

export const hashtags = pgTable('hashtags', {
  id: id64('id').primaryKey(),
  tag: text('tag').notNull().unique(),
});

export const postHashtags = pgTable(
  'post_hashtags',
  {
    postId: postRef('post_id'),
    hashtagId: id64('hashtag_id')
      .notNull()
      .references(() => hashtags.id, { onDelete: 'cascade' }),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.hashtagId] }),
    index('post_hashtags_hashtag_idx').on(t.hashtagId, t.postId.desc().nullsFirst()),
    index('post_hashtags_created_at_idx').on(t.createdAt),
  ],
);

export const mentions = pgTable(
  'mentions',
  { postId: postRef('post_id'), userId: userRef('user_id') },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);
