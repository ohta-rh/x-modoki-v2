// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Post } from '@/entities/post';
import { PostFeed } from './post-feed';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

const post = (id: number, isAuthor: boolean): Post => ({
  id: String(id),
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: `投稿 ${id}`,
  createdAt: '2026-11-18T03:00:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor },
  repostedBy: null,
  replyTo: null,
  quoted: null,
});

describe('PostFeed', () => {
  it('自分の投稿だけに削除のメニューを付け、消したら一覧を読み直す', async () => {
    const fetchSpy = vi.fn(async () =>
      Response.json({ items: [post(2, false)], nextCursor: null }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const deleteAction = vi.fn(async () => ({ ok: true as const }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostFeed
          queryKey={['replies', '1']}
          endpoint="/api/posts/1/replies"
          firstPage={{ items: [post(1, true), post(2, false)], nextCursor: null }}
          now="2026-11-18T03:00:00.000Z"
          deleteAction={deleteAction}
        />
      </QueryClientProvider>,
    );
    const [mine, theirs] = screen.getAllByRole('article');
    expect(within(theirs).queryByRole('button', { name: 'もっと見る' })).toBeNull();
    await userEvent.click(within(mine).getByRole('button', { name: 'もっと見る' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '削除' }),
    );
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
    expect(fetchSpy).toHaveBeenCalledWith('/api/posts/1/replies?cursor=');
    // Counts shown outside the list (the parent's replies) are server data: read the page again.
    expect(refresh).toHaveBeenCalled();
  });
});
