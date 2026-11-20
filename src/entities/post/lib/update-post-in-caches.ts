import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Post, PostPage } from '../model/types';

// Only the post lists are infinite queries in this app; Object() lets undefined data through safely.
const isPostPages = (data: unknown): data is InfiniteData<PostPage> =>
  Array.isArray((Object(data) as { pages?: unknown }).pages);

/**
 * Rewrites one post wherever a post list holds it — both home tabs, replies, bookmarks (#21) — so
 * a like or a bookmark shows the same everywhere at once. Other cached data is left alone.
 */
export function updatePostInCaches(
  client: QueryClient,
  postId: string,
  update: (post: Post) => Post,
): void {
  for (const [key, data] of client.getQueriesData({})) {
    if (!isPostPages(data)) continue;
    client.setQueryData<InfiniteData<PostPage>>(key, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => (item.id === postId ? update(item) : item)),
      })),
    });
  }
}

/**
 * Drops one post from every post list it is in — a deleted post's card, and the repost rows that
 * show it (#68). A list read again later gets the same from the server.
 */
export function removePostFromCaches(client: QueryClient, postId: string): void {
  for (const [key, data] of client.getQueriesData({})) {
    if (!isPostPages(data)) continue;
    client.setQueryData<InfiniteData<PostPage>>(key, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.filter((item) => item.id !== postId),
      })),
    });
  }
}
