import 'server-only';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import type { PostPage } from '@/entities/post';
import { searchPosts } from '@/entities/post/index.server';
import type { FollowPage } from '@/entities/user';
import { searchUsers } from '@/entities/user/index.server';
import { type SearchFilter, searchFilter, searchQuery } from '@/features/search-box';
import { getSession } from '@/shared/auth/index.server';

export type SearchPageData = {
  q: string;
  filter: SearchFilter;
  now: string;
  signedIn: boolean;
  results: { kind: 'posts'; page: PostPage } | { kind: 'users'; page: FollowPage };
};

type Param = string | string[] | undefined;
/** A search parameter's value: the first when the name repeats. */
const first = (param: Param) => (Array.isArray(param) ? param[0] : param) ?? null;

/** /search?q=&f= (#27): the first page of the chosen tab. A query that cannot be searched opens /explore. */
export async function loadSearchPage(qParam: Param, fParam: Param): Promise<SearchPageData> {
  await connection(); // read per request, never while prerendering
  const q = searchQuery(first(qParam));
  if (q === null) redirect('/explore' as Route);
  const filter = searchFilter(first(fParam));
  // No cursor is given, so neither search can refuse it.
  const results =
    filter === 'user'
      ? {
          kind: 'users' as const,
          page: ((await searchUsers(q, null)) as { page: FollowPage }).page,
        }
      : {
          kind: 'posts' as const,
          page: ((await searchPosts(q, filter, null)) as { page: PostPage }).page,
        };
  return {
    q,
    filter,
    now: new Date().toISOString(),
    signedIn: (await getSession()) !== null,
    results,
  };
}
