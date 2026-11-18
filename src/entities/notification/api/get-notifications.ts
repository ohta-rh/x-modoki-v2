import 'server-only';
import { and, desc, eq, inArray, lt, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getSession } from '@/shared/auth/index.server';
import { getDb, notifications, posts, user } from '@/shared/db';
import { parseId } from '@/shared/lib/id';
import { mediaUrl } from '@/shared/lib/media-url';
import type { NotificationPage } from '../model/types';

const PAGE_SIZE = 20;
/** The 「メンション」 tab: being named in a post, a reply included (as on X). */
const MENTION_TYPES = ['mention', 'reply'] as const;

export type NotificationsTab = 'all' | 'mentions';
export type NotificationsResult =
  { ok: true; page: NotificationPage } | { ok: false; error: 'UNAUTHORIZED' | 'BAD_CURSOR' };

/**
 * The viewer's own notifications (#26), newest first, 20 at a time. The cursor is the last
 * notification's id: ids are time-ordered (ADR-0016), so it is exact. Only the recipient reads them.
 */
export async function getNotifications(
  tab: NotificationsTab,
  cursor: string | null,
): Promise<NotificationsResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const where: SQL[] = [eq(notifications.recipientId, viewer.id)];
  if (tab === 'mentions') where.push(inArray(notifications.type, [...MENTION_TYPES]));
  if (cursor !== null) {
    const before = parseId(cursor);
    if (before === null) return { ok: false, error: 'BAD_CURSOR' };
    where.push(lt(notifications.id, before));
  }
  const actor = alias(user, 'actor');
  const author = alias(user, 'author');
  const rows = await getDb()
    .select({
      id: notifications.id,
      type: notifications.type,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
      actorUsername: actor.username,
      actorName: actor.name,
      actorImage: actor.image,
      postId: posts.id,
      postText: posts.text,
      authorUsername: author.username,
    })
    .from(notifications)
    .innerJoin(actor, eq(actor.id, notifications.actorId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .leftJoin(author, eq(author.id, posts.authorId))
    .where(and(...where))
    .orderBy(desc(notifications.id))
    .limit(PAGE_SIZE + 1);
  const page = rows.slice(0, PAGE_SIZE);
  return {
    ok: true,
    page: {
      items: page.map((row) => ({
        id: row.id.toString(),
        type: row.type,
        createdAt: row.createdAt.toISOString(),
        read: row.readAt !== null,
        actor: {
          username: row.actorUsername!,
          name: row.actorName,
          avatarUrl: mediaUrl(row.actorImage),
        },
        post:
          row.postId === null
            ? null
            : {
                id: row.postId.toString(),
                text: row.postText!,
                authorUsername: row.authorUsername!,
              },
      })),
      nextCursor: rows.length > PAGE_SIZE ? page[page.length - 1].id.toString() : null,
    },
  };
}
