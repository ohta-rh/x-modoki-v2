import type { Route } from 'next';
import Link from 'next/link';
import { setBookmarkAction } from '@/features/post-bookmark/index.server';
import { createQuoteAction } from '@/features/post-compose/index.server';
import { deletePostAction } from '@/features/post-delete/index.server';
import { setLikeAction } from '@/features/post-like/index.server';
import { setRepostAction } from '@/features/post-repost/index.server';
import { type SearchFilter, SearchBox } from '@/features/search-box';
import { setFollowAction } from '@/features/user-follow/index.server';
import { LOGIN_PATH } from '@/shared/config';
import { UserResults } from '@/widgets/search-results';
import { PostFeed } from '@/widgets/timeline-feed';
import type { SearchPageData } from '../api/load-search-page';

const TABS: { filter: SearchFilter; label: string }[] = [
  { filter: 'top', label: '話題' },
  { filter: 'live', label: '最新' },
  { filter: 'user', label: 'ユーザー' },
  { filter: 'media', label: 'メディア' },
];

const href = (q: string, filter: SearchFilter) =>
  `/search?q=${encodeURIComponent(q)}${filter === 'top' ? '' : `&f=${filter}`}`;

/** /search?q=&f= (#27): the box with the query, 話題 / 最新 / ユーザー / メディア, and that tab's results. */
export function SearchPage({ q, filter, now, signedIn, results }: SearchPageData) {
  return (
    <>
      <div className="sticky top-0 z-10 bg-[var(--header-bg)] px-4 pt-2 backdrop-blur-[12px]">
        {/* The screen's name for assistive technology; the box says it to the eye (#31). */}
        <h1 className="sr-only">{`「${q}」の検索結果`}</h1>
        <SearchBox key={q} defaultValue={q} label="話題を検索" />
        <div role="tablist" className="mt-2 flex border-b border-line">
          {TABS.map((tab) => {
            const selected = tab.filter === filter;
            return (
              <Link
                key={tab.filter}
                href={href(q, tab.filter) as Route}
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
      </div>
      {results.kind === 'users' ? (
        <UserResults
          key={q}
          q={q}
          firstPage={results.page}
          {...(signedIn ? { action: setFollowAction } : { loginHref: LOGIN_PATH })}
        />
      ) : (
        <PostFeed
          key={`${q}:${filter}`}
          queryKey={['search', q, filter]}
          endpoint={`/api/search?q=${encodeURIComponent(q)}&f=${filter}`}
          firstPage={results.page}
          now={now}
          likeAction={signedIn ? setLikeAction : undefined}
          bookmarkAction={signedIn ? setBookmarkAction : undefined}
          repostAction={signedIn ? setRepostAction : undefined}
          quoteAction={signedIn ? createQuoteAction : undefined}
          deleteAction={deletePostAction}
          emptyText={`「${q}」の検索結果はありません`}
        />
      )}
    </>
  );
}
