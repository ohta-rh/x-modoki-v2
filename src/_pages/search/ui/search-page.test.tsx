// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchPage } from './search-page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/form', () => ({
  // Every attribute through, role and aria-label included (#31).
  default: ({ children, ...props }: React.ComponentProps<'form'>) => (
    <form {...props}>{children}</form>
  ),
}));
vi.mock('@/features/post-like/index.server', () => ({ setLikeAction: async () => ({ ok: true }) }));
vi.mock('@/features/post-bookmark/index.server', () => ({
  setBookmarkAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-compose/index.server', () => ({
  createQuoteAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-delete/index.server', () => ({
  deletePostAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-repost/index.server', () => ({
  setRepostAction: async () => ({ ok: true }),
}));
vi.mock('@/features/user-follow/index.server', () => ({
  setFollowAction: async () => ({ ok: true }),
}));

const post = {
  id: '1',
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: '猫の話',
  links: [],
  createdAt: '2026-11-18T03:00:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
  repostedBy: null,
  replyTo: null,
  quoted: null,
};

const show = (props: Parameters<typeof SearchPage>[0]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SearchPage {...props} />
    </QueryClientProvider>,
  );

describe('SearchPage（#27）', () => {
  it('検索の欄に今の語、4 つのタブ（話題 / 最新 / ユーザー / メディア）、投稿の結果', () => {
    show({
      q: '猫',
      filter: 'top',
      now: '2026-11-18T03:00:00.000Z',
      signedIn: true,
      results: { kind: 'posts', page: { items: [post], nextCursor: null } },
    });
    expect(screen.getByRole('searchbox', { name: '検索' })).toHaveValue('猫');
    const tabs = within(screen.getByRole('tablist'));
    const q = encodeURIComponent('猫');
    expect(
      tabs.getAllByRole('tab').map((tab) => [tab.textContent, tab.getAttribute('href')]),
    ).toEqual([
      ['話題', `/search?q=${q}`],
      ['最新', `/search?q=${q}&f=live`],
      ['ユーザー', `/search?q=${q}&f=user`],
      ['メディア', `/search?q=${q}&f=media`],
    ]);
    expect(tabs.getByRole('tab', { name: '話題' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('article')).toHaveTextContent('猫の話');
  });

  // NFR-A11Y-08: 見出しの順とランドマーク
  it('画面の名前の h1 と、名前の付いた検索のランドマークがある（#31）', () => {
    show({
      q: '猫',
      filter: 'top',
      now: '2026-11-18T03:00:00.000Z',
      signedIn: true,
      results: { kind: 'posts', page: { items: [], nextCursor: null } },
    });
    expect(screen.getByRole('heading', { level: 1, name: '「猫」の検索結果' })).toBeInTheDocument();
    expect(screen.getByRole('search', { name: '話題を検索' })).toBeInTheDocument();
    // Below 640px the box keeps clear of the account avatar (#85 review), and the tall sticky
    // block marks itself for the scroll padding (#86 review).
    expect(screen.getByRole('search', { name: '話題を検索' }).parentElement).toHaveClass(
      'pl-10',
      'sm:pl-0',
    );
    expect(screen.getByRole('heading', { level: 1 }).closest('[data-tall-sticky]')).not.toBeNull();
  });

  it('結果が無ければ案内。ユーザーのタブは人の一覧（ログインしていなければフォローはログインへ）', () => {
    const { unmount } = show({
      q: '無い語',
      filter: 'live',
      now: '2026-11-18T03:00:00.000Z',
      signedIn: false,
      results: { kind: 'posts', page: { items: [], nextCursor: null } },
    });
    expect(screen.getByText('「無い語」の検索結果はありません')).toBeInTheDocument();
    unmount();
    show({
      q: 'hana',
      filter: 'user',
      now: '2026-11-18T03:00:00.000Z',
      signedIn: false,
      results: {
        kind: 'users',
        page: {
          items: [
            {
              username: 'hana',
              name: '花子',
              avatarUrl: null,
              bio: '',
              isFollowing: false,
              isSelf: false,
            },
          ],
          nextCursor: null,
        },
      },
    });
    expect(screen.getByRole('tab', { name: 'ユーザー' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'フォロー' })).toHaveAttribute(
      'href',
      expect.stringContaining('/i/flow/login'),
    );
  });

  it('ログインしていればユーザーのタブのフォローはボタン', () => {
    show({
      q: 'hana',
      filter: 'user',
      now: '2026-11-18T03:00:00.000Z',
      signedIn: true,
      results: {
        kind: 'users',
        page: {
          items: [
            {
              username: 'hana',
              name: '花子',
              avatarUrl: null,
              bio: '',
              isFollowing: false,
              isSelf: false,
            },
          ],
          nextCursor: null,
        },
      },
    });
    expect(screen.getByRole('button', { name: 'フォロー' })).toBeInTheDocument();
  });
});
