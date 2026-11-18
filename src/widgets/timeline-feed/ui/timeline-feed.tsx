'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect } from 'react';
import { PostCard, type PostPage, type TimelineKind } from '@/entities/post';
import { Spinner } from '@/shared/ui/spinner';

type Props = { kind: TimelineKind; firstPage: PostPage; now: string };

export const timelineKey = (kind: TimelineKind) => ['timeline', kind] as const;

async function fetchPage(kind: TimelineKind, cursor: string): Promise<PostPage> {
  const response = await fetch(`/api/timeline/${kind}?cursor=${cursor}`);
  if (!response.ok) throw new Error(`timeline ${response.status}`);
  return response.json();
}

/**
 * A home timeline (docs/architecture/ui-ux.md 6): the first page comes from the server as
 * initialData (ADR-0010); the rest load by cursor when the last card is rendered. Cards outside
 * the viewport are not in the DOM (window virtualisation).
 */
export function TimelineFeed({ kind, firstPage, now }: Props) {
  const query = useInfiniteQuery({
    queryKey: timelineKey(kind),
    queryFn: ({ pageParam }) => fetchPage(kind, pageParam),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: { pages: [firstPage], pageParams: [''] },
    // The server just rendered this page; do not fetch it again on mount.
    staleTime: 30_000,
  });
  const posts = query.data.pages.flatMap((page) => page.items);
  const virtualizer = useWindowVirtualizer({
    count: posts.length,
    estimateSize: () => 120,
    overscan: 5,
  });
  const rows = virtualizer.getVirtualItems();
  const lastShown = rows.at(-1)?.index ?? -1;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && lastShown >= posts.length - 1) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, lastShown, posts.length]);

  if (posts.length === 0) {
    return <p className="px-4 py-8 text-center text-text-muted">まだポストがありません</p>;
  }
  const date = new Date(now);
  return (
    <div>
      <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {rows.map((row) => (
          <div
            key={posts[row.index].id}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute inset-x-0 top-0"
            style={{ transform: `translateY(${row.start}px)` }}
          >
            <PostCard post={posts[row.index]} now={date} />
          </div>
        ))}
      </div>
      {query.isFetchNextPageError ? (
        <p role="alert" className="px-4 py-6 text-center text-text-muted">
          続きを読み込めませんでした
        </p>
      ) : hasNextPage ? (
        <Spinner />
      ) : null}
    </div>
  );
}
