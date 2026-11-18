// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PostDetailPage } from './post-detail-page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/post-compose/index.server', () => ({
  createReplyAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-delete/index.server', () => ({
  deletePostAction: async () => ({ ok: true }),
}));

describe('PostDetailPage', () => {
  it('ヘッダーに「ポスト」、その下にスレッド', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostDetailPage
          now="2026-11-18T03:00:00.000Z"
          signedIn={false}
          detail={{
            ancestors: [],
            replies: { items: [], nextCursor: null },
            post: {
              id: '1',
              author: { username: 'taro', name: '太郎', avatarUrl: null },
              text: '本文',
              createdAt: '2026-11-18T03:00:00.000Z',
              media: [],
              counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
              viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
              repostedBy: null,
              replyTo: null,
              quoted: null,
            },
          }}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'ポスト' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: '投稿の本体' })).toHaveTextContent('本文');
  });

  it('返信に続きがあれば、その投稿の返信の続きを読む', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ items: [], nextCursor: null }));
    vi.stubGlobal('fetch', fetchSpy);
    const reply = {
      id: '2',
      author: { username: 'hana', name: '花', avatarUrl: null },
      text: '返信',
      createdAt: '2026-11-18T03:00:00.000Z',
      media: [],
      counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
      viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
      repostedBy: null,
      replyTo: { username: 'taro' },
      quoted: null,
    };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostDetailPage
          now="2026-11-18T03:00:00.000Z"
          signedIn={false}
          detail={{
            ancestors: [],
            replies: { items: [reply], nextCursor: '2' },
            post: {
              ...reply,
              id: '1',
              text: '本文',
              replyTo: null,
              author: { username: 'taro', name: '太郎', avatarUrl: null },
            },
          }}
        />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/posts/1/replies?cursor=2'));
  });
});
