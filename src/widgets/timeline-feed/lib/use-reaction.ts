'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Post } from '@/entities/post';
import { toast } from '@/shared/ui/kit';
import { updatePostInCaches } from './update-post-in-caches';

type Kind = 'like' | 'bookmark';
type Result = { ok: true; count: number } | { ok: false; message: string };
export type ReactionAction = (postId: string, on: boolean) => Promise<Result>;

const FIELDS = {
  like: { flag: 'liked', count: 'likes', failure: 'いいねできませんでした' },
  bookmark: {
    flag: 'bookmarked',
    count: 'bookmarks',
    failure: 'ブックマークを変えられませんでした',
  },
} as const;

/**
 * A like or bookmark press in a list (#21, ADR-0010): the post changes in every list at once before
 * the server answers, settles on the server's count, and is put back with a toast if it fails.
 */
/** `action` may be absent (signed out): the buttons are then not shown, so it is never called. */
export function useReaction(kind: Kind, action: ReactionAction | undefined) {
  const client = useQueryClient();
  const { flag, count, failure } = FIELDS[kind];
  const set = (postId: string, on: boolean, value: (post: Post) => number) =>
    updatePostInCaches(client, postId, (post) => ({
      ...post,
      viewer: { ...post.viewer, [flag]: on },
      counts: { ...post.counts, [count]: value(post) },
    }));
  const mutation = useMutation({
    mutationFn: async ({ postId, on }: { postId: string; on: boolean }) => {
      const result = await action!(postId, on);
      if (!result.ok) throw new Error(result.message);
      return result.count;
    },
    onMutate: ({ postId, on }) =>
      set(postId, on, (post) => Math.max(post.counts[count] + (on ? 1 : -1), 0)),
    onSuccess: (serverCount, { postId, on }) => set(postId, on, () => serverCount),
    onError: (_error, { postId, on }) => {
      set(postId, !on, (post) => Math.max(post.counts[count] + (on ? -1 : 1), 0));
      toast.add({ title: failure });
    },
  });
  return (post: Post) => mutation.mutate({ postId: post.id, on: !post.viewer[flag] });
}
