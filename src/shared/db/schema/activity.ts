// Notifications and rate limits (docs/architecture/data-model.md 2–3).
import { sql } from 'drizzle-orm';
import { index, integer, pgTable, primaryKey, text, unique } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';
import { at, id64 } from './columns.ts';
import { posts } from './posts.ts';

export const notifications = pgTable(
  'notifications',
  {
    id: id64('id').primaryKey(),
    recipientId: text('recipient_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type', {
      enum: ['like', 'repost', 'reply', 'quote', 'mention', 'follow'],
    }).notNull(),
    postId: id64('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    readAt: at('read_at'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    // One row per actor, type and post; a follow has no post, so NULLs must count as equal.
    unique('notifications_once').on(t.recipientId, t.actorId, t.type, t.postId).nullsNotDistinct(),
    index('notifications_recipient_idx').on(t.recipientId, t.id.desc().nullsFirst()),
    index('notifications_unread_idx')
      .on(t.recipientId)
      .where(sql`${t.readAt} IS NULL`),
  ],
);

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: at('window_start').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
