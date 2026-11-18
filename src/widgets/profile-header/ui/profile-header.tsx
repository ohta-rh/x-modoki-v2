import { CalendarDays, Link2, MapPin } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { Profile } from '@/entities/user';
import { joinedMonth } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';

/** The top of a profile (#23, ui-ux.md 8): banner, overlapping avatar, who they are, counts. */
export function ProfileHeader({ profile }: { profile: Profile }) {
  const link = profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return (
    <section aria-label="プロフィール" className="border-b border-line">
      <div data-banner className="aspect-[3/1] w-full bg-hover">
        {profile.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user media from storage, sized by the box
          <img src={profile.bannerUrl} alt="" className="size-full object-cover" />
        ) : null}
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="-mt-[15%] rounded-full border-4 border-bg bg-bg">
            <Avatar name={profile.name} src={profile.avatarUrl} size={134} />
          </div>
          {profile.isSelf ? (
            <Link
              href={'/settings/profile' as Route}
              className="mt-3 rounded-full border border-line px-4 py-1.5 text-body font-bold hover:bg-hover"
            >
              プロフィールを編集
            </Link>
          ) : null}
        </div>
        <h2 className="mt-3 text-title font-extrabold">{profile.name}</h2>
        <p className="text-body text-text-muted">@{profile.username}</p>
        {profile.bio ? <p className="mt-3 text-body whitespace-pre-wrap">{profile.bio}</p> : null}
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-body text-text-muted">
          {profile.location ? (
            <span className="flex items-center gap-1">
              <MapPin aria-hidden="true" className="size-[18px]" />
              {profile.location}
            </span>
          ) : null}
          {profile.website ? (
            <span className="flex items-center gap-1">
              <Link2 aria-hidden="true" className="size-[18px]" />
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-brand hover:underline"
              >
                {link}
              </a>
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <CalendarDays aria-hidden="true" className="size-[18px]" />
            {joinedMonth(new Date(profile.joinedAt))}
          </span>
        </p>
        <p className="mt-3 flex gap-5 text-body text-text-muted">
          <span>
            <span className="font-bold text-text">
              {profile.followingCount.toLocaleString('ja-JP')}
            </span>{' '}
            フォロー中
          </span>
          <span>
            <span className="font-bold text-text">
              {profile.followersCount.toLocaleString('ja-JP')}
            </span>{' '}
            フォロワー
          </span>
        </p>
      </div>
    </section>
  );
}
