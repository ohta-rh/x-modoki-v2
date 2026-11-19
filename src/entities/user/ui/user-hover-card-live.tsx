'use client';

import { PreviewCard } from '@base-ui/react/preview-card';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import { Avatar } from '@/shared/ui/avatar';
import type { Profile } from '../model/types';

export type Props = {
  username: string;
  name: string;
  /** The link's accessible name. */
  label?: string;
  className?: string;
  children: ReactNode;
};

async function fetchProfile(username: string): Promise<Profile> {
  const response = await fetch(`/api/users/${username}`);
  if (!response.ok) throw new Error(`profile ${response.status}`);
  return response.json();
}

/**
 * A link to a profile that, after about half a second of hover, shows a small card of the user
 * (#23, as on X). The profile is read only when the card opens. Loaded by UserHoverCard the first
 * time someone hovers a name (#32), then open from the start.
 */
export function UserHoverCardLive({
  username,
  name,
  label,
  className,
  children,
  defaultOpen = false,
}: Props & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!open || profile) return;
    // A card that cannot be read stays with the name only; nothing else depends on it.
    fetchProfile(username).then(setProfile, () => undefined);
  }, [open, profile, username]);
  const href = `/${username}` as Route;
  return (
    <PreviewCard.Root open={open} onOpenChange={setOpen}>
      <PreviewCard.Trigger
        delay={500}
        render={<Link href={href} aria-label={label} className={className} />}
      >
        {children}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner sideOffset={8} className="z-50">
          <PreviewCard.Popup
            role="dialog"
            aria-label={`${name} のプロフィールのカード`}
            className="w-72 rounded-card bg-bg p-4 text-body shadow-lg ring-1 ring-line"
          >
            <Avatar name={name} src={profile?.avatarUrl ?? null} size={64} />
            <p className="mt-2 font-bold">{name}</p>
            <p className="text-text-muted">@{username}</p>
            {profile ? (
              <>
                {profile.bio ? <p className="mt-2">{profile.bio}</p> : null}
                <p className="mt-2 flex gap-4 text-text-muted">
                  <span>
                    <span className="font-bold text-text">{profile.followingCount}</span> フォロー中
                  </span>
                  <span>
                    <span className="font-bold text-text">{profile.followersCount}</span> フォロワー
                  </span>
                </p>
              </>
            ) : null}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
