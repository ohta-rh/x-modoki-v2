import type { NotificationGroup, NotificationItem } from '../model/types';

/** Kinds shown as one row per post however many people did it; the rest are one row each. */
const GROUPED = new Set<NotificationItem['type']>(['like', 'repost', 'follow']);

/**
 * Folds a page of notifications (newest first) into rows (#26, ui-ux.md 通知): likes, reposts and
 * follows of one post — follows have none — become one row at the place of the newest, with every
 * actor in order. A row is read only when all of it is.
 */
export function groupNotifications(items: NotificationItem[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();
  for (const item of items) {
    const key = GROUPED.has(item.type) ? `${item.type}:${item.post?.id ?? ''}` : item.id;
    const group = groups.get(key);
    if (group) {
      group.actors.push(item.actor);
      group.read &&= item.read;
    } else {
      groups.set(key, {
        key,
        type: item.type,
        post: item.post,
        actors: [item.actor],
        createdAt: item.createdAt,
        read: item.read,
      });
    }
  }
  return [...groups.values()];
}

const ENDINGS: Record<NotificationItem['type'], string> = {
  like: 'があなたのポストをいいねしました',
  repost: 'があなたのポストをリポストしました',
  follow: 'にフォローされました',
  reply: 'が返信しました',
  quote: 'があなたのポストを引用しました',
  mention: 'があなたをメンションしました',
};

/** 「A さんが…」, or 「A さんと他 N 人が…」 when several people did the same. */
export function describeGroup(group: NotificationGroup): string {
  const others = group.actors.length - 1;
  const who = `${group.actors[0].name}さん${others > 0 ? `と他${others}人` : ''}`;
  return `${who}${ENDINGS[group.type]}`;
}
