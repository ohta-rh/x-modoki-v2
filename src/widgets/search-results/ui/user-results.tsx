'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FollowPage, FollowUser } from '@/entities/user';
import { type FollowActionResult, FollowButton } from '@/features/user-follow';
import { Avatar } from '@/shared/ui/avatar';
import { Spinner } from '@/shared/ui/spinner';
import { OFFLINE_MESSAGE, settle } from '@/shared/lib/settle';
import { toast } from '@/shared/ui/toast';

type Props = {
  q: string;
  firstPage: FollowPage;
  /** Follows or unfollows; absent when signed out (then the button links to `loginHref`). */
  action?: (username: string, following: boolean) => Promise<FollowActionResult>;
  loginHref?: string;
};

async function fetchPage(url: string): Promise<FollowPage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`search ${response.status}`);
  return response.json();
}

function Row({
  person,
  action,
  loginHref,
}: { person: FollowUser } & Pick<Props, 'action' | 'loginHref'>) {
  const [following, setFollowing] = useState(person.isFollowing);
  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    const result = await settle(action!(person.username, next), {
      ok: false,
      code: 'OFFLINE',
      message: OFFLINE_MESSAGE,
    });
    if (result.ok) return;
    setFollowing(!next);
    toast.add({ title: result.message });
  };
  return (
    <li className="flex gap-3 border-b border-line px-4 py-3">
      <Link href={`/${person.username}` as Route} className="shrink-0">
        <Avatar name={person.name} src={person.avatarUrl} />
      </Link>
      <div className="min-w-0 flex-1 text-body">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/${person.username}` as Route} className="min-w-0">
            <span className="block truncate font-bold hover:underline">{person.name}</span>
            <span className="block truncate text-text-muted">@{person.username}</span>
          </Link>
          {person.isSelf ? null : loginHref !== undefined ? (
            <FollowButton following={false} loginHref={loginHref} />
          ) : (
            <FollowButton following={following} onToggle={() => void toggle()} />
          )}
        </div>
        {person.bio ? <p className="mt-1 break-words">{person.bio}</p> : null}
      </div>
    </li>
  );
}

/** The ユーザー tab of a search (#27): matching people, 20 at a time, each with a follow button. */
export function UserResults({ q, firstPage, action, loginHref }: Props) {
  const query = useInfiniteQuery({
    queryKey: ['search', q, 'user'],
    queryFn: ({ pageParam }) =>
      fetchPage(`/api/search?q=${encodeURIComponent(q)}&f=user&cursor=${pageParam}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: { pages: [firstPage], pageParams: [''] },
    staleTime: 30_000,
  });
  const people = query.data.pages.flatMap((page) => page.items);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loaded = query.data.pages.length;
  useEffect(() => {
    // Re-run after every page (`loaded`): see #53. A failed page is not retried in a loop.
    if (hasNextPage && !isFetchingNextPage && !query.isFetchNextPageError) void fetchNextPage();
  }, [loaded, hasNextPage, isFetchingNextPage, fetchNextPage, query.isFetchNextPageError]);
  if (people.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-text-muted">「{q}」に一致するユーザーはいません</p>
    );
  }
  return (
    <>
      <ul>
        {people.map((person) => (
          <Row key={person.username} person={person} action={action} loginHref={loginHref} />
        ))}
      </ul>
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
