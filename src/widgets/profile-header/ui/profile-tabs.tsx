import type { Route } from 'next';
import Link from 'next/link';
import type { UserPostsTab } from '@/entities/post';

const TABS: { tab: UserPostsTab; label: string; path: string }[] = [
  { tab: 'posts', label: 'ポスト', path: '' },
  { tab: 'with_replies', label: '返信', path: '/with_replies' },
  { tab: 'media', label: 'メディア', path: '/media' },
  { tab: 'likes', label: 'いいね', path: '/likes' },
];

type Props = { username: string; tab: UserPostsTab; isSelf: boolean };

/** ポスト / 返信 / メディア, and いいね for the user alone (#23, ui-ux.md 8). */
export function ProfileTabs({ username, tab, isSelf }: Props) {
  return (
    <div role="tablist" className="flex border-b border-line">
      {TABS.filter((item) => item.tab !== 'likes' || isSelf).map((item) => {
        const selected = item.tab === tab;
        return (
          <Link
            key={item.tab}
            href={`/${username}${item.path}` as Route}
            role="tab"
            aria-selected={selected}
            className={`flex h-[53px] flex-1 items-center justify-center hover:bg-hover ${selected ? 'font-bold' : 'text-text-muted'}`}
          >
            <span className="relative flex h-full items-center">
              {item.label}
              {selected ? (
                <span
                  data-indicator
                  className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-brand"
                />
              ) : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
