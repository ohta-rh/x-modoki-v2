import type { Route } from 'next';
import Link from 'next/link';
import type { FollowListType, FollowPage, Profile } from '@/entities/user';
import { setFollowAction } from '@/features/user-follow/index.server';
import { PageHeader } from '@/widgets/app-shell';
import { FollowList } from './follow-list';

type Props = { profile: Profile; type: FollowListType; firstPage: FollowPage; signedIn: boolean };

const TABS: { type: FollowListType; label: string }[] = [
  { type: 'followers', label: 'フォロワー' },
  { type: 'following', label: 'フォロー中' },
];

/** /{username}/followers and /following (#24). */
export function FollowListPage({ profile, type, firstPage, signedIn }: Props) {
  return (
    <>
      <PageHeader title={profile.name}>
        <span className="ml-3 shrink-0 text-[13px] whitespace-nowrap text-text-muted">
          @{profile.username}
        </span>
      </PageHeader>
      <div role="tablist" className="flex border-b border-line">
        {TABS.map((tab) => {
          const selected = tab.type === type;
          return (
            <Link
              key={tab.type}
              href={`/${profile.username}/${tab.type}` as Route}
              role="tab"
              aria-selected={selected}
              className={`flex h-[53px] flex-1 items-center justify-center hover:bg-hover ${selected ? 'font-bold' : 'text-text-muted'}`}
            >
              <span className="relative flex h-full items-center">
                {tab.label}
                {selected ? (
                  <span className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-brand" />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
      <FollowList
        username={profile.username}
        type={type}
        firstPage={firstPage}
        signedIn={signedIn}
        action={setFollowAction}
      />
    </>
  );
}
