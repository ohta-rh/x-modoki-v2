// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Post } from '@/entities/post';
import { ViewCounter } from './view-counter';

const post = (id: string): Post => ({
  id,
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: '本文',
  links: [],
  createdAt: '2026-11-18T03:00:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 5 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
  repostedBy: null,
  replyTo: null,
  quoted: null,
});

/** A client whose home list holds post 42 and another post. */
function withList() {
  const client = new QueryClient();
  client.setQueryData(['timeline', 'for-you'], {
    pages: [{ items: [post('42'), post('9')], nextCursor: null }],
    pageParams: [null],
  });
  const wrap = (children: ReactNode) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const views = () =>
    client
      .getQueryData<{ pages: { items: Post[] }[] }>(['timeline', 'for-you'])!
      .pages[0].items.map((item) => item.counts.views);
  return { wrap, views };
}

describe('ViewCounter（#21）', () => {
  it('開いたときに 1 回だけ、表示を数える POST を送り、何も描かない', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);
    const { wrap } = withList();
    const { container, rerender } = render(wrap(<ViewCounter postId="42" />));
    rerender(wrap(<ViewCounter postId="42" />));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith('/api/posts/42/view', { method: 'POST' });
    expect(container).toBeEmptyDOMElement();
  });

  it('送れなくても、画面に何も起きない（投げない）。一覧の数も変えない', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('offline');
    });
    vi.stubGlobal('fetch', fetchSpy);
    const errors = vi.spyOn(console, 'error');
    const { wrap, views } = withList();
    render(wrap(<ViewCounter postId="7" />));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await new Promise((done) => setTimeout(done, 0));
    expect(errors).not.toHaveBeenCalled();
    expect(views()).toEqual([5, 5]);
  });

  // FR-VIEW-01: 投稿の詳細
  it('数えたら、一覧のキャッシュのその投稿の表示の数を 1 増やす（戻ったホームのカードに出る、#69）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    const { wrap, views } = withList();
    render(wrap(<ViewCounter postId="42" />));
    await waitFor(() => expect(views()).toEqual([6, 5]));
  });

  it('数えられなかった（404 など）なら、数を変えない', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchSpy);
    const { wrap, views } = withList();
    render(wrap(<ViewCounter postId="42" />));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await new Promise((done) => setTimeout(done, 0));
    expect(views()).toEqual([5, 5]);
  });
});
