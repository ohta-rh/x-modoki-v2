'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

type Props = {
  /** The newest post shown; null while the list is empty. */
  since: string | null;
  /** The list to read again when pressed. */
  queryKey: readonly string[];
};

/** A refusal (signed out) carries no count: the query fails and no button shows. */
async function fetchCount(since: string): Promise<number> {
  const response = await fetch(`/api/timeline/following/new-count?since=${since}`);
  return ((await response.json()) as { count: number }).count;
}

/**
 * 「N 件のポストを表示」 (#28, ui-ux.md 6): asks every 30 seconds, and not while the tab is hidden
 * (ADR-0011), how many posts are above the newest shown. The list does not move until it is
 * pressed; then it is read again from the top.
 */
export function NewPostsButton({ since, queryKey }: Props) {
  const queryClient = useQueryClient();
  const { data: count = 0 } = useQuery({
    queryKey: ['new-posts', since],
    queryFn: () => fetchCount(since!),
    enabled: since !== null,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    // The list was just read: start from nothing newer, and ask first after 30 seconds.
    initialData: 0,
    staleTime: 30_000,
  });
  if (count === 0) return null;
  return (
    // No height of its own: the button floats over the list, which does not move (review 3).
    <div className="pointer-events-none sticky top-[106px] z-10 flex h-0 justify-center overflow-visible">
      <button
        type="button"
        className="pointer-events-auto mt-2 rounded-full bg-brand-fill px-4 py-2 text-body font-bold text-on-brand shadow-lg"
        onClick={() => {
          // Every count kept so far is now shown, this one included: the button goes at once, and
          // reading again, which goes back to the first page's top for a moment, shows no old count
          // (review 2).
          queryClient.setQueriesData({ queryKey: ['new-posts'] }, 0);
          void queryClient.resetQueries({ queryKey });
          window.scrollTo({ top: 0 });
        }}
      >
        {count} 件のポストを表示
      </button>
    </div>
  );
}
