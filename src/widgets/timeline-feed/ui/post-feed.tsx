'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PostCard, type PostPage } from '@/entities/post';
import { BookmarkButton } from '@/features/post-bookmark';
import { type DeletePostActionResult, DeletePostMenu } from '@/features/post-delete';
import { LikeButton } from '@/features/post-like';
import { Spinner } from '@/shared/ui/spinner';
import { type ReactionAction, useReaction } from '../lib/use-reaction';

export type PostFeedProps = {
  queryKey: readonly string[];
  /** The list's Route Handler; pages are read from `${endpoint}?cursor=…` ('' for the first). A
   * string, not a function: server components pass it to this client component. */
  endpoint: string;
  firstPage: PostPage;
  now: string;
  /** Deletes one of the viewer's own posts; without it no card shows the ⋯ menu. */
  deleteAction?: (postId: string) => Promise<DeletePostActionResult>;
  /** Like / bookmark Server Actions; without them the card shows the counts as text (signed out). */
  likeAction?: ReactionAction;
  bookmarkAction?: ReactionAction;
  emptyText?: string;
};

async function fetchPage(url: string): Promise<PostPage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`timeline ${response.status}`);
  return response.json();
}

/**
 * A list of posts (docs/architecture/ui-ux.md 6): the first page comes from the server as
 * initialData (ADR-0010); the rest load by cursor when the last card is rendered. Cards outside
 * the viewport are not in the DOM (window virtualisation). Used for timelines and replies.
 */
export function PostFeed({
  queryKey,
  endpoint,
  firstPage,
  now,
  deleteAction,
  likeAction,
  bookmarkAction,
  emptyText = 'まだポストがありません',
}: PostFeedProps) {
  const queryClient = useQueryClient();
  const toggleLike = useReaction('like', likeAction);
  const toggleBookmark = useReaction('bookmark', bookmarkAction);
  const router = useRouter();
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(`${endpoint}?cursor=${pageParam}`),
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
    return <p className="px-4 py-8 text-center text-text-muted">{emptyText}</p>;
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
            <PostCard
              post={posts[row.index]}
              now={date}
              like={
                likeAction ? (
                  <LikeButton
                    liked={posts[row.index].viewer.liked}
                    count={posts[row.index].counts.likes}
                    onToggle={() => toggleLike(posts[row.index])}
                  />
                ) : undefined
              }
              bookmark={
                bookmarkAction ? (
                  <BookmarkButton
                    bookmarked={posts[row.index].viewer.bookmarked}
                    onToggle={() => toggleBookmark(posts[row.index])}
                  />
                ) : undefined
              }
              menu={
                deleteAction && posts[row.index].viewer.isAuthor ? (
                  <DeletePostMenu
                    postId={posts[row.index].id}
                    action={deleteAction}
                    onDeleted={() => {
                      void queryClient.resetQueries({ queryKey });
                      // Counts outside the list (a parent's replies) are server data.
                      router.refresh();
                    }}
                  />
                ) : undefined
              }
            />
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
