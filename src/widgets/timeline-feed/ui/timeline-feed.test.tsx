// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Post, PostPage } from '@/entities/post';
import { HomeTimeline } from './home-timeline';
import { TimelineFeed } from './timeline-feed';

const post = (id: number): Post => ({
  id: String(id),
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: `投稿 ${id}`,
  createdAt: '2026-11-18T03:00:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false },
  repostedBy: null,
  replyTo: null,
  quoted: null,
});
const page = (ids: number[], nextCursor: string | null): PostPage => ({
  items: ids.map(post),
  nextCursor,
});
const now = '2026-11-18T03:00:00.000Z';

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('TimelineFeed（ui-ux.md の 6 節）', () => {
  it('最初のページの投稿を出し、続きが無ければ読み込まない', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(wrap(<TimelineFeed kind="following" firstPage={page([3, 2, 1], null)} now={now} />));
    expect(screen.getAllByRole('article').map((article) => article.textContent)).toEqual([
      expect.stringContaining('投稿 3'),
      expect.stringContaining('投稿 2'),
      expect.stringContaining('投稿 1'),
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('最後のカードまで出たら、カーソルで続きを読み、つなげて出す', async () => {
    const fetchSpy = vi.fn(async () => Response.json(page([1], null)));
    vi.stubGlobal('fetch', fetchSpy);
    render(wrap(<TimelineFeed kind="for-you" firstPage={page([3, 2], '2')} now={now} />));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3));
    expect(fetchSpy).toHaveBeenCalledWith('/api/timeline/for-you?cursor=2');
  });

  it('続きを読めなければ、そう知らせる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    render(wrap(<TimelineFeed kind="for-you" firstPage={page([3, 2], '2')} now={now} />));
    expect(await screen.findByRole('alert')).toHaveTextContent('続きを読み込めませんでした');
  });

  it('投稿が無ければ、そう書く', () => {
    render(wrap(<TimelineFeed kind="following" firstPage={page([], null)} now={now} />));
    expect(screen.getByText('まだポストがありません')).toBeInTheDocument();
  });
});

describe('HomeTimeline', () => {
  it('投稿したら、タイムラインの 1 ページ目を読み直して先頭に出す', async () => {
    const fetchSpy = vi.fn(async () => Response.json(page([4, 3], null)));
    vi.stubGlobal('fetch', fetchSpy);
    const action = vi.fn(async () => ({ ok: true as const }));
    render(
      wrap(<HomeTimeline kind="following" firstPage={page([3], null)} now={now} action={action} />),
    );
    await userEvent.type(screen.getByRole('textbox', { name: '投稿の本文' }), '投稿 4');
    await userEvent.click(screen.getByRole('button', { name: 'ポストする' }));
    await waitFor(() => expect(screen.getAllByRole('article')[0]).toHaveTextContent('投稿 4'));
    expect(fetchSpy).toHaveBeenCalledWith('/api/timeline/following?cursor=');
  });
});
