// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './home-page';

vi.mock('@/features/post-compose/index.server', () => ({
  createPostAction: async () => ({ ok: true }),
  createQuoteAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-delete/index.server', () => ({
  deletePostAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-like/index.server', () => ({
  setLikeAction: async () => ({ ok: true, count: 1 }),
}));
vi.mock('@/features/post-bookmark/index.server', () => ({
  setBookmarkAction: async () => ({ ok: true, count: 1 }),
}));
vi.mock('@/features/post-repost/index.server', () => ({
  setRepostAction: async () => ({ ok: true, count: 1 }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const empty = { items: [], nextCursor: null };
const renderHome = (kind: 'following' | 'for-you') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HomePage kind={kind} firstPage={empty} now="2026-11-18T03:00:00.000Z" />
    </QueryClientProvider>,
  );

describe('HomePage（ui-ux.md の 6 節）', () => {
  it('ヘッダーに「ホーム」、タブは「おすすめ」と「フォロー中」で、選んだタブに 4px の下線', () => {
    renderHome('following');
    expect(screen.getByRole('heading', { level: 1, name: 'ホーム' })).toBeInTheDocument();
    const tabs = screen.getByRole('tablist');
    expect(within(tabs).getByRole('tab', { name: 'おすすめ' })).toHaveAttribute('href', '/home');
    const following = within(tabs).getByRole('tab', { name: 'フォロー中' });
    expect(following).toHaveAttribute('href', '/home?tab=following');
    expect(following).toHaveAttribute('aria-selected', 'true');
    expect(following.querySelector('[data-indicator]')).toHaveClass('h-1', 'bg-brand');
    expect(
      within(tabs).getByRole('tab', { name: 'おすすめ' }).querySelector('[data-indicator]'),
    ).toBeNull();
  });

  it('入力欄とタイムラインを出す', () => {
    renderHome('for-you');
    expect(screen.getByRole('textbox', { name: '投稿の本文' })).toBeInTheDocument();
    // #25: images can be attached.
    expect(screen.getByLabelText('画像を追加')).toBeInTheDocument();
    expect(screen.getByText('まだポストがありません')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'おすすめ' })).toHaveAttribute('aria-selected', 'true');
  });

  it('自分の投稿には、削除のメニューを付ける（#20）', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <HomePage
          kind="following"
          now="2026-11-18T03:00:00.000Z"
          firstPage={{
            nextCursor: null,
            items: [
              {
                id: '1',
                author: { username: 'taro', name: '太郎', avatarUrl: null },
                text: '自分の投稿',
                createdAt: '2026-11-18T03:00:00.000Z',
                media: [],
                counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
                viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: true },
                repostedBy: null,
                replyTo: null,
                quoted: null,
              },
            ],
          }}
        />
      </QueryClientProvider>,
    );
    const article = within(screen.getByRole('article'));
    expect(article.getByRole('button', { name: 'もっと見る' })).toBeInTheDocument();
    // #21: the timeline's cards can be liked and bookmarked.
    expect(article.getByRole('button', { name: 'いいね' })).toBeInTheDocument();
    expect(article.getByRole('button', { name: 'ブックマーク' })).toBeInTheDocument();
    // #22: and reposted or quoted.
    expect(article.getByRole('button', { name: 'リポスト' })).toBeInTheDocument();
  });
});
