'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FollowListType, FollowPage, FollowUser } from '@/entities/user';
import { type FollowActionResult, FollowButton } from '@/features/user-follow';
import { toast } from '@/shared/ui/toast';
import { Avatar } from '@/shared/ui/avatar';
import { Spinner } from '@/shared/ui/spinner';

type Props = {
  username: string;
  type: FollowListType;
  firstPage: FollowPage;
  signedIn: boolean;
  action: (username: string, following: boolean) => Promise<FollowActionResult>;
};

async function fetchPage(url: string): Promise<FollowPage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`follows ${response.status}`);
  return response.json();
}

function Row({
  person,
  loginHref,
  action,
}: {
  person: FollowUser;
  loginHref: string | null;
  action: Props['action'];
}) {
  const [following, setFollowing] = useState(person.isFollowing);
  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    const result = await action(person.username, next);
    if (!result.ok) {
      setFollowing(!next);
      toast.add({ title: result.message });
    }
  };
  const profile = `/${person.username}` as Route;
  return (
    <li className="flex gap-3 border-b border-line px-4 py-3">
      <Link href={profile} className="shrink-0">
        <Avatar name={person.name} src={person.avatarUrl} />
      </Link>
      <div className="min-w-0 flex-1 text-body">
        <div className="flex items-start justify-between gap-2">
          <Link href={profile} className="min-w-0">
            <span className="block truncate font-bold hover:underline">{person.name}</span>
            <span className="block truncate text-text-muted">@{person.username}</span>
          </Link>
          {person.isSelf ? null : loginHref ? (
            <FollowButton following={false} loginHref={loginHref} />
          ) : (
            <FollowButton following={following} onToggle={() => void toggle()} />
          )}
        </div>
        {person.bio ? <p className="mt-1">{person.bio}</p> : null}
      </div>
    </li>
  );
}

/** The people in a follow list with their follow buttons; more load as the end is reached (#24). */
export function FollowList({ username, type, firstPage, signedIn, action }: Props) {
  const query = useInfiniteQuery({
    queryKey: ['follows', username, type],
    queryFn: ({ pageParam }) =>
      fetchPage(`/api/users/${username}/follows?type=${type}&cursor=${pageParam}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: { pages: [firstPage], pageParams: [''] },
    staleTime: 30_000,
  });
  const people = query.data.pages.flatMap((page) => page.items);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loaded = query.data.pages.length;
  useEffect(() => {
    // A failed page is not retried in a loop; the alert below says so. `loaded` re-runs this after
    // every page: the fetching flag can go up and down between two renders and leave the rest
    // unchanged, which stopped the loading after the second page (#53).
    if (hasNextPage && !isFetchingNextPage && !query.isFetchNextPageError) void fetchNextPage();
  }, [loaded, hasNextPage, isFetchingNextPage, fetchNextPage, query.isFetchNextPageError]);
  if (people.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-text-muted">
        {type === 'followers' ? 'まだフォロワーがいません' : 'まだ誰もフォローしていません'}
      </p>
    );
  }
  const loginHref = signedIn
    ? null
    : `/i/flow/login?next=${encodeURIComponent(`/${username}/${type}`)}`;
  return (
    <>
      <ul>
        {people.map((person) => (
          <Row key={person.username} person={person} loginHref={loginHref} action={action} />
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
