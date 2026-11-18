'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useOptimistic } from 'react';
import type { Post } from '@/entities/post';
import { BookmarkButton, type BookmarkActionResult } from '@/features/post-bookmark';
import { LikeButton, type ReactionActionResult } from '@/features/post-like';
import { toast } from '@/shared/ui/kit';

type Props = {
  post: Post;
  likeAction: (postId: string, liked: boolean) => Promise<ReactionActionResult>;
  bookmarkAction: (postId: string, bookmarked: boolean) => Promise<BookmarkActionResult>;
};
type State = { liked: boolean; likes: number; bookmarked: boolean };

/**
 * The like and bookmark of the post on its detail page (#21, ADR-0010: useOptimistic). The press
 * shows at once; the server's answer then reloads the page, and a failure puts it back with a toast.
 */
export function MainPostReactions({ post, likeAction, bookmarkAction }: Props) {
  const router = useRouter();
  const [state, change] = useOptimistic<State, Partial<State>>(
    { liked: post.viewer.liked, likes: post.counts.likes, bookmarked: post.viewer.bookmarked },
    (current, next) => ({ ...current, ...next }),
  );
  const run = (next: Partial<State>, send: () => Promise<{ ok: boolean }>, failure: string) =>
    startTransition(async () => {
      change(next);
      const result = await send().catch(() => ({ ok: false }));
      if (result.ok) router.refresh();
      else toast.add({ title: failure });
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
            'ブックマークを変えられませんでした',
          )
        }
      />
    </>
  );
}
