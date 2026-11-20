/** One notification as the viewer may see it (#26): no internal columns. */
export type NotificationItem = {
  id: string;
  type: 'like' | 'repost' | 'reply' | 'quote' | 'mention' | 'follow';
  createdAt: string;
  read: boolean;
  actor: { username: string; name: string; avatarUrl: string | null };
  /** The post it is about: the viewer's post for a like or repost, the actor's for the rest. */
  post: { id: string; text: string; authorUsername: string } | null;
};

export type NotificationPage = { items: NotificationItem[]; nextCursor: string | null };

/** Notifications of one type about one post, shown as one row (「A さんと他 2 人が…」). */
export type NotificationGroup = {
  key: string;
  type: NotificationItem['type'];
  post: NotificationItem['post'];
  actors: NotificationItem['actor'][];
  createdAt: string;
  read: boolean;
};
