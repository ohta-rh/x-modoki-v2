'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { PostPage } from '@/entities/post';
import {
  type BookmarkActionResult,
  ClearBookmarksMenu,
  type ClearBookmarksActionResult,
} from '@/features/post-bookmark';
import type { DeletePostActionResult } from '@/features/post-delete';
import type { ReactionActionResult } from '@/features/post-like';
import { PageHeader } from '@/widgets/app-shell';
import { PostFeed } from '@/widgets/timeline-feed';

export const bookmarksKey = ['bookmarks'] as const;

type Props = {
  username: string;
  firstPage: PostPage;
  now: string;
  clearAction: () => Promise<ClearBookmarksActionResult>;
  likeAction: (postId: string, on: boolean) => Promise<ReactionActionResult>;
  bookmarkAction: (postId: string, on: boolean) => Promise<BookmarkActionResult>;
  deleteAction: (postId: string) => Promise<DeletePostActionResult>;
};

/** The header with its ⋯ menu and the bookmark list; 全て削除 empties the list (#21). */
export function BookmarksFeed({ username, clearAction, ...feed }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (
    <>
      <PageHeader title="ブックマーク">
        <span className="ml-2 text-body text-text-muted">@{username}</span>
        <ClearBookmarksMenu
          action={clearAction}
          onCleared={() => {
            void queryClient.resetQueries({ queryKey: bookmarksKey });
            router.refresh();
          }}
        />
      </PageHeader>
      <PostFeed
        queryKey={bookmarksKey}
        endpoint="/api/bookmarks"
        emptyText="まだブックマークがありません"
        {...feed}
      />
    </>
  );
}
