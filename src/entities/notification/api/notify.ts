import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { newId } from '@/shared/lib/id';
import { notifications, type Tx } from '@/shared/db';

export type NewNotification = {
  recipientId: string;
  actorId: string;
  type: 'like' | 'repost' | 'reply' | 'quote' | 'mention' | 'follow';
  /** The post it is about; a follow has none. */
  postId: bigint | null;
};

/**
 * Writes notifications inside the caller's transaction, so they exist exactly when the action
 * does (#26, ADR-0011). Nothing for an action on oneself; the same actor, type and post is one row
 * however often it repeats (`notifications_once`).
 */
export async function notify(tx: Tx, items: NewNotification[]): Promise<void> {
  const others = items.filter((item) => item.recipientId !== item.actorId);
  if (others.length === 0) return;
  await tx
    .insert(notifications)
    .values(others.map((item) => ({ id: newId(), ...item })))
    .onConflictDoNothing();
}

/** Removes the notification of an action that was taken back (an unlike, an unfollow, …). */
export async function unnotify(tx: Tx, item: NewNotification): Promise<void> {
  await tx
    .delete(notifications)
    .where(
      and(
        eq(notifications.recipientId, item.recipientId),
        eq(notifications.actorId, item.actorId),
        eq(notifications.type, item.type),
        item.postId === null ? isNull(notifications.postId) : eq(notifications.postId, item.postId),
      ),
    );
}

/**
 * Removes every notification about a post that was deleted (#26): reactions to it and what it told
 * others (a reply, a quote, a mention). Posts are deleted softly, so no foreign key does this.
 */
export async function forgetPost(tx: Tx, postId: bigint): Promise<void> {
  await tx.delete(notifications).where(eq(notifications.postId, postId));
}
