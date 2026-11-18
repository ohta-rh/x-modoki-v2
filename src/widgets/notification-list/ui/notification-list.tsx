'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, Heart, MessageCircle, Quote, Repeat2, User } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  describeGroup,
  groupNotifications,
  type NotificationGroup,
  type NotificationPage,
} from '@/entities/notification';
import type { MarkNotificationsReadResult } from '@/features/notifications-read';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/avatar';
import { Spinner } from '@/shared/ui/spinner';

type Props = {
  tab: 'all' | 'mentions';
  firstPage: NotificationPage;
  markRead: (upTo: string) => Promise<MarkNotificationsReadResult>;
};

/** ui-ux.md 通知: a heart for likes, arrows for reposts, a person for follows. */
const ICONS = {
  like: { Icon: Heart, color: 'text-like', fill: true },
  repost: { Icon: Repeat2, color: 'text-repost', fill: false },
  follow: { Icon: User, color: 'text-brand', fill: true },
  reply: { Icon: MessageCircle, color: 'text-brand', fill: false },
  quote: { Icon: Quote, color: 'text-brand', fill: false },
  mention: { Icon: AtSign, color: 'text-brand', fill: false },
} as const;

async function fetchPage(url: string): Promise<NotificationPage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`notifications ${response.status}`);
  return response.json();
}

function Row({ group }: { group: NotificationGroup }) {
  const { Icon, color, fill } = ICONS[group.type];
  return (
    <article
      data-unread={!group.read}
      className={cn('flex gap-3 border-b border-line px-4 py-3', !group.read && 'bg-brand/5')}
    >
      <Icon
        aria-hidden="true"
        data-icon={group.type}
        className={cn('size-7 shrink-0', color)}
        fill={fill ? 'currentColor' : 'none'}
      />
      <div className="min-w-0 flex-1 text-body">
        <div className="flex gap-1">
          {group.actors.slice(0, 8).map((actor) => (
            <Link key={actor.username} href={`/${actor.username}` as Route} aria-label={actor.name}>
              <Avatar name={actor.name} src={actor.avatarUrl} size={32} />
            </Link>
          ))}
        </div>
        <p className="mt-2">{describeGroup(group)}</p>
        {group.post ? (
          <Link
            href={`/${group.post.authorUsername}/status/${group.post.id}` as Route}
            className="mt-1 block text-text-muted hover:underline"
          >
            {group.post.text}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

/**
 * The viewer's notifications (#26): grouped rows, newest first; more load as the end is reached.
 * Opening it marks what it shows read and clears the badge.
 */
export function NotificationList({ tab, firstPage, markRead }: Props) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['notifications', tab],
    queryFn: ({ pageParam }) => fetchPage(`/api/notifications?tab=${tab}&cursor=${pageParam}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: { pages: [firstPage], pageParams: [''] },
    staleTime: 30_000,
  });
  const items = query.data.pages.flatMap((page) => page.items);
  const newest = items[0]?.id;
  useEffect(() => {
    if (newest === undefined) return;
    void markRead(newest).then(() =>
      queryClient.setQueryData(['notifications', 'unread-count'], 0),
    );
  }, [newest, markRead, queryClient]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loaded = query.data.pages.length;
  useEffect(() => {
    // A failed page is not retried in a loop; the alert below says so. `loaded` re-runs this after
    // every page: the fetching flag can go up and down between two renders and leave the rest
    // unchanged, which stopped the loading after the second page.
    if (hasNextPage && !isFetchingNextPage && !query.isFetchNextPageError) void fetchNextPage();
  }, [loaded, hasNextPage, isFetchingNextPage, fetchNextPage, query.isFetchNextPageError]);
  if (items.length === 0) {
    return <p className="px-4 py-8 text-center text-text-muted">まだ通知はありません</p>;
  }
  return (
    <>
      {groupNotifications(items).map((group) => (
        <Row key={group.key} group={group} />
      ))}
      {query.isFetchNextPageError ? (
        <p role="alert" className="px-4 py-6 text-center text-text-muted">
          続きを読み込めませんでした
        </p>
      ) : hasNextPage ? (
        <Spinner />
      ) : null}
    </>
  );
}
