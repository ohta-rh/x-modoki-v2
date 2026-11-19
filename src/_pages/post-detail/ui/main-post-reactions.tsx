'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { startTransition, useOptimistic } from 'react';
import { type Post, updatePostInCaches } from '@/entities/post';
import { BookmarkButton, type BookmarkActionResult } from '@/features/post-bookmark';
import { LikeButton, type ReactionActionResult } from '@/features/post-like';
import { toast } from '@/shared/ui/toast';

type Props = {
  post: Post;
  likeAction: (postId: string, liked: boolean) => Promise<ReactionActionResult>;
  bookmarkAction: (postId: string, bookmarked: boolean) => Promise<BookmarkActionResult>;
};
type State = { liked: boolean; likes: number; bookmarked: boolean };

/**
 * The like and bookmark of the post on its detail page (#21, ADR-0010: useOptimistic). The press
 * shows at once; the server's answer goes into every post list that holds this post and reloads the
 * page, and a failure puts it back with a toast.
 */
export function MainPostReactions({ post, likeAction, bookmarkAction }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, change] = useOptimistic<State, Partial<State>>(
    { liked: post.viewer.liked, likes: post.counts.likes, bookmarked: post.viewer.bookmarked },
    (current, next) => ({ ...current, ...next }),
  );
  const run = (
    next: Partial<State>,
    send: () => Promise<{ ok: true; count: number } | { ok: false }>,
    settle: (target: Post, count: number) => Post,
    failure: string,
  ) =>
    startTransition(async () => {
      change(next);
      const result = await send().catch(() => ({ ok: false }) as const);
      if (!result.ok) {
        toast.add({ title: failure });
        return;
      }
      updatePostInCaches(queryClient, post.id, (target) => settle(target, result.count));
      router.refresh();
    });
  return (
    <>
      <LikeButton
        liked={state.liked}
        count={state.likes}
        onToggle={() =>
          run(
            { liked: !state.liked, likes: Math.max(state.likes + (state.liked ? -1 : 1), 0) },
            () => likeAction(post.id, !state.liked),
            (target, count) => ({
              ...target,
              viewer: { ...target.viewer, liked: !state.liked },
              counts: { ...target.counts, likes: count },
            }),
            'いいねできませんでした',
          )
        }
      />
      <BookmarkButton
        bookmarked={state.bookmarked}
        onToggle={() =>
          run(
            { bookmarked: !state.bookmarked },
            () => bookmarkAction(post.id, !state.bookmarked),
            (target, count) => ({
              ...target,
              viewer: { ...target.viewer, bookmarked: !state.bookmarked },
              counts: { ...target.counts, bookmarks: count },
            }),
            'ブックマークを変えられませんでした',
          )
        }
      />
    </>
  );
}
