'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { updatePostInCaches } from '@/entities/post';

/**
 * Counts one view of a post's detail when it opens (#21). A lost view does not matter, so a failed
 * request is ignored and nothing is drawn. A counted view also shows on the lists' card of the
 * post, so Back to them shows the new number (#69).
 */
export function ViewCounter({ postId }: { postId: string }) {
  const client = useQueryClient();
  useEffect(() => {
    fetch(`/api/posts/${postId}/view`, { method: 'POST' }).then(
      (response) => {
        if (!response.ok) return;
        updatePostInCaches(client, postId, (post) => ({
          ...post,
          counts: { ...post.counts, views: post.counts.views + 1 },
        }));
      },
      () => undefined,
    );
  }, [client, postId]);
  return null;
}
