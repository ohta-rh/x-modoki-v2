// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Post } from '@/entities/post';
import { toast } from '@/shared/ui/kit';
import { describe, expect, it, vi } from 'vitest';
import { PostDetailPage } from './post-detail-page';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
const setLikeAction = vi.fn();
const setBookmarkAction = vi.fn();
vi.mock('@/features/post-like/index.server', () => ({
  setLikeAction: (...args: unknown[]) => setLikeAction(...args),
}));
vi.mock('@/features/post-bookmark/index.server', () => ({
  setBookmarkAction: (...args: unknown[]) => setBookmarkAction(...args),
}));
vi.mock('@/features/post-compose/index.server', () => ({
  createReplyAction: async () => ({ ok: true }),
  createQuoteAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-repost/index.server', () => ({
  setRepostAction: async () => ({ ok: true, count: 1 }),
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

  it('開くと、その投稿の表示を数える（#21）', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);
    renderDetail(false);
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith('/api/posts/1/view', { method: 'POST' }),
    );
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

const make = (id: string, text: string): Post => ({
  id,
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text,
  createdAt: '2026-11-18T03:00:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes: 2, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
  repostedBy: null,
  replyTo: null,
  quoted: null,
});
const renderDetail = (signedIn: boolean) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PostDetailPage
        now="2026-11-18T03:00:00.000Z"
        signedIn={signedIn}
        detail={{
          ancestors: [],
          replies: { items: [make('2', '返信')], nextCursor: null },
          post: make('1', '本文'),
        }}
      />
    </QueryClientProvider>,
  );

describe('PostDetailPage のいいね・ブックマーク（#21）', () => {
  it('ログインしていれば、本体と返信にいいねとブックマーク。ログインしていなければ出さない', () => {
    const { unmount } = renderDetail(true);
    const main = within(screen.getByRole('article', { name: '投稿の本体' }));
    expect(main.getByRole('button', { name: 'いいね' })).toBeInTheDocument();
    expect(main.getByRole('button', { name: 'ブックマーク' })).toBeInTheDocument();
    const reply = within(within(screen.getByRole('region', { name: '返信' })).getByRole('article'));
    expect(reply.getByRole('button', { name: 'いいね' })).toBeInTheDocument();
    expect(reply.getByRole('button', { name: 'リポスト' })).toBeInTheDocument();
    unmount();
    renderDetail(false);
    expect(screen.queryByRole('button', { name: 'いいね' })).toBeNull();
  });

  it('本体のいいねは押した直後に変わり、終わったら画面を読み直す', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    setLikeAction.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
    renderDetail(true);
    const main = within(screen.getByRole('article', { name: '投稿の本体' }));
    const like = main.getByRole('button', { name: 'いいね' });
    await userEvent.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveTextContent('3');
    expect(setLikeAction).toHaveBeenCalledWith('1', true);
    resolve({ ok: true, count: 3 });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('本体のブックマークが失敗したら元に戻り、トーストが出る', async () => {
    const add = vi.spyOn(toast, 'add');
    setBookmarkAction.mockResolvedValueOnce({ ok: false, message: 'この投稿は見つかりません' });
    renderDetail(true);
    const main = within(screen.getByRole('article', { name: '投稿の本体' }));
    const bookmark = main.getByRole('button', { name: 'ブックマーク' });
    await userEvent.click(bookmark);
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({ title: 'ブックマークを変えられませんでした' }),
    );
    await waitFor(() => expect(bookmark).toHaveAttribute('aria-pressed', 'false'));
  });

  it('本体のいいねが通信で失敗しても（投げても）、元に戻りトーストが出る', async () => {
    const add = vi.spyOn(toast, 'add');
    setLikeAction.mockRejectedValueOnce(new Error('network'));
    renderDetail(true);
    const like = within(screen.getByRole('article', { name: '投稿の本体' })).getByRole('button', {
      name: 'いいね',
    });
    await userEvent.click(like);
    await waitFor(() => expect(add).toHaveBeenCalledWith({ title: 'いいねできませんでした' }));
    await waitFor(() => expect(like).toHaveAttribute('aria-pressed', 'false'));
  });

  it('いいね済みの本体を押すと、すぐに取り消して数を 1 減らす', async () => {
    // Still waiting for the server: what shows is the optimistic state.
    setLikeAction.mockImplementationOnce(() => new Promise(() => undefined));
    const liked = make('1', '本文');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostDetailPage
          now="2026-11-18T03:00:00.000Z"
          signedIn
          detail={{
            ancestors: [],
            replies: { items: [], nextCursor: null },
            post: { ...liked, viewer: { ...liked.viewer, liked: true } },
          }}
        />
      </QueryClientProvider>,
    );
    const like = within(screen.getByRole('article', { name: '投稿の本体' })).getByRole('button', {
      name: 'いいね',
    });
    await userEvent.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(like).toHaveTextContent('1');
    expect(setLikeAction).toHaveBeenLastCalledWith('1', false);
  });

  it('本体をいいねすると、ホームの一覧にある同じ投稿もサーバーの数で変わる', async () => {
    setLikeAction.mockResolvedValueOnce({ ok: true, count: 9 });
    const client = new QueryClient();
    client.setQueryData(['timeline', 'following'], {
      pages: [{ items: [make('1', '本文')], nextCursor: null }],
      pageParams: [''],
    });
    render(
      <QueryClientProvider client={client}>
        <PostDetailPage
          now="2026-11-18T03:00:00.000Z"
          signedIn
          detail={{
            ancestors: [],
            replies: { items: [], nextCursor: null },
            post: make('1', '本文'),
          }}
        />
      </QueryClientProvider>,
    );
    await userEvent.click(
      within(screen.getByRole('article', { name: '投稿の本体' })).getByRole('button', {
        name: 'いいね',
      }),
    );
    const cached = () =>
      client.getQueryData<{ pages: { items: Post[] }[] }>(['timeline', 'following'])!.pages[0]
        .items[0];
    await waitFor(() => expect(cached().counts.likes).toBe(9));
    expect(cached().viewer.liked).toBe(true);
  });

  it('本体をブックマークすると、一覧にある同じ投稿のブックマークもサーバーの数で変わる', async () => {
    setBookmarkAction.mockResolvedValueOnce({ ok: true, count: 4 });
    const client = new QueryClient();
    client.setQueryData(['bookmarks'], {
      pages: [{ items: [make('1', '本文')], nextCursor: null }],
      pageParams: [''],
    });
    render(
      <QueryClientProvider client={client}>
        <PostDetailPage
          now="2026-11-18T03:00:00.000Z"
          signedIn
          detail={{
            ancestors: [],
            replies: { items: [], nextCursor: null },
            post: make('1', '本文'),
          }}
        />
      </QueryClientProvider>,
    );
    await userEvent.click(
      within(screen.getByRole('article', { name: '投稿の本体' })).getByRole('button', {
        name: 'ブックマーク',
      }),
    );
    const cached = () =>
      client.getQueryData<{ pages: { items: Post[] }[] }>(['bookmarks'])!.pages[0].items[0];
    await waitFor(() => expect(cached().counts.bookmarks).toBe(4));
    expect(cached().viewer.bookmarked).toBe(true);
  });
});
