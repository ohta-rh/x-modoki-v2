'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import type { FollowUser } from '@/entities/user';
import { type FollowActionResult, FollowButton } from '@/features/user-follow';
import { Avatar } from '@/shared/ui/avatar';

type Props = {
  users: FollowUser[];
  /** Follows or unfollows; absent when signed out (then the button links to `loginHref`). */
  action?: (username: string, following: boolean) => Promise<FollowActionResult>;
  loginHref?: string;
};

function Row({ person, action, loginHref }: { person: FollowUser } & Omit<Props, 'users'>) {
  const [following, setFollowing] = useState(person.isFollowing);
  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    const result = await action!(person.username, next);
    if (!result.ok) setFollowing(!next);
  };
  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-hover">
      <Link
        href={`/${person.username}` as Route}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar name={person.name} src={person.avatarUrl} />
        <span className="min-w-0">
          <span className="block truncate font-bold">{person.name}</span>
          <span className="block truncate text-text-muted">@{person.username}</span>
        </span>
      </Link>
      {loginHref !== undefined ? (
        <FollowButton following={false} loginHref={loginHref} />
      ) : (
        <FollowButton following={following} onToggle={() => void toggle()} />
      )}
    </li>
  );
}

/** おすすめユーザー (#27): a few people to follow, each with a follow button. */
export function WhoToFollow({ users, action, loginHref }: Props) {
  if (users.length === 0) return null;
  return (
    <section aria-labelledby="who-to-follow-title" className="rounded-2xl border border-line">
      <h2 id="who-to-follow-title" className="px-4 py-3 text-title font-extrabold">
        おすすめユーザー
      </h2>
      <ul>
        {users.map((person) => (
          <Row key={person.username} person={person} action={action} loginHref={loginHref} />
        ))}
      </ul>
    </section>
  );
}
