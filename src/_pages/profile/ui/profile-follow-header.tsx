'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useOptimistic } from 'react';
import type { Profile } from '@/entities/user';
import { type FollowActionResult, FollowButton } from '@/features/user-follow';
import { toast } from '@/shared/ui/toast';
import { ProfileHeader } from '@/widgets/profile-header';

type Props = {
  profile: Profile;
  signedIn: boolean;
  action: (username: string, following: boolean) => Promise<FollowActionResult>;
};

/**
 * Someone else's profile header with the follow button (#24, ADR-0010: useOptimistic). The button
 * and the follower count change at once; the server's answer reloads the page, a failure puts both
 * back with a toast. Signed out, the button is a link to the login screen.
 */
export function ProfileFollowHeader({ profile, signedIn, action }: Props) {
  const router = useRouter();
  const [state, change] = useOptimistic(
    { following: profile.isFollowing, followers: profile.followersCount },
    (_current, next: { following: boolean; followers: number }) => next,
  );
  const toggle = () =>
    startTransition(async () => {
      const following = !state.following;
      change({ following, followers: Math.max(state.followers + (following ? 1 : -1), 0) });
      const result = await action(profile.username, following);
      if (result.ok) router.refresh();
      else toast.add({ title: result.message });
    });
  return (
    <ProfileHeader
      profile={{ ...profile, followersCount: state.followers }}
      action={
        signedIn ? (
          <FollowButton following={state.following} onToggle={toggle} />
        ) : (
          <FollowButton
            following={false}
            loginHref={`/i/flow/login?next=${encodeURIComponent(`/${profile.username}`)}`}
          />
        )
      }
    />
  );
}
