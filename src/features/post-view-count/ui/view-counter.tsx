'use client';

import { useEffect } from 'react';

/**
 * Counts one view of a post's detail when it opens (#21). A lost view does not matter, so a failed
 * request is ignored and nothing is drawn.
 */
export function ViewCounter({ postId }: { postId: string }) {
  useEffect(() => {
    fetch(`/api/posts/${postId}/view`, { method: 'POST' }).catch(() => undefined);
  }, [postId]);
  return null;
}
