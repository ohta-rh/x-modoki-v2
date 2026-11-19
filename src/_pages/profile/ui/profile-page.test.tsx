// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from '@/shared/ui/toast';
import { describe, expect, it, vi } from 'vitest';
import type { Post } from '@/entities/post';
import type { Profile } from '@/entities/user';
import { ProfileNotFound } from './profile-not-found';
import { ProfilePage } from './profile-page';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock('@/features/post-like/index.server', () => ({
  setLikeAction: async () => ({ ok: true, count: 1 }),
}));
vi.mock('@/features/post-bookmark/index.server', () => ({
  setBookmarkAction: async () => ({ ok: true, count: 1 }),
}));
vi.mock('@/features/post-repost/index.server', () => ({
  setRepostAction: async () => ({ ok: true, count: 1 }),
}));
vi.mock('@/features/post-compose/index.server', () => ({
  createQuoteAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-delete/index.server', () => ({
  deletePostAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-pin/index.server', () => ({ setPinAction: async () => ({ ok: true }) }));
const setFollowAction = vi.fn();
vi.mock('@/features/user-follow/index.server', () => ({
  setFollowAction: (...args: unknown[]) => setFollowAction(...args),
}));

const profile: Profile = {
  username: 'hanako',
  name: '花子',
  avatarUrl: null,
  bannerUrl: null,
  bio: '',
  location: '',
  website: '',
  joinedAt: '2025-04-01T00:00:00.000Z',
  followersCount: 0,
  followingCount: 0,
  postsCount: 12,
  isSelf: true,
  isFollowing: false,
};
const post: Post = {
  id: '1',
  author: { username: 'hanako', name: '花子', avatarUrl: null },
  text: '本文',
  links: [],
  createdAt: '2026-11-18T03:00:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: true },
  repostedBy: null,
  replyTo: null,
  quoted: null,
};
const page = (props: Partial<Parameters<typeof ProfilePage>[0]>) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfilePage
        profile={profile}
        tab="posts"
        firstPage={{ items: [post], nextCursor: null }}
        now="2026-11-18T03:00:00.000Z"
        signedIn
        {...props}
      />
    </QueryClientProvider>,
  );

describe('ProfilePage（#23）', () => {
  it('ヘッダーに名前と投稿の数、プロフィール、タブ、一覧。本人には固定の項目', async () => {
    page({});
    expect(screen.getByRole('heading', { level: 1, name: '花子' })).toBeInTheDocument();
    expect(screen.getByText('12 件のポスト')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'プロフィール' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ポスト' })).toHaveAttribute('aria-selected', 'true');
    const article = within(screen.getByRole('article'));
    expect(article.getByRole('button', { name: 'いいね' })).toBeInTheDocument();
    expect(article.getByRole('button', { name: 'もっと見る' })).toBeInTheDocument();
  });

  it('ログインしていなければ操作を出さない。タブごとの空の文言', () => {
    page({ signedIn: false, tab: 'media', firstPage: { items: [], nextCursor: null } });
    expect(screen.getByText('まだメディアがありません')).toBeInTheDocument();
  });

  it('ログインして他人のプロフィールを見るときは、メニューに固定の項目を出さない', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    page({
      profile: { ...profile, isSelf: false },
      firstPage: {
        items: [{ ...post, viewer: { ...post.viewer, isAuthor: true } }],
        nextCursor: null,
      },
    });
    await userEvent.click(screen.getByRole('button', { name: 'もっと見る' }));
    expect(await screen.findByRole('menuitem', { name: '削除' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'プロフィールに固定する' })).toBeNull();
  });

  it('本人でも、ポストのタブ以外では固定の項目を出さない（固定の印はポストのタブだけにある）', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    page({ tab: 'with_replies' });
    await userEvent.click(screen.getByRole('button', { name: 'もっと見る' }));
    expect(await screen.findByRole('menuitem', { name: '削除' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'プロフィールに固定する' })).toBeNull();
  });

  it('無いアカウントの画面', () => {
    render(<ProfileNotFound />);
    expect(
      screen.getByRole('heading', { name: 'このアカウントは存在しません' }),
    ).toBeInTheDocument();
  });
});

describe('ProfilePage のフォロー（#24）', () => {
  it('他人には「フォロー」。押すとすぐ「フォロー中」とフォロワー +1、終わったら読み直す', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    setFollowAction.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
    page({ profile: { ...profile, isSelf: false, followersCount: 4 } });
    const header = within(screen.getByRole('region', { name: 'プロフィール' }));
    await userEvent.click(header.getByRole('button', { name: 'フォロー' }));
    expect(header.getByRole('button', { name: 'フォロー中' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'プロフィール' })).toHaveTextContent('5 フォロワー');
    expect(setFollowAction).toHaveBeenCalledWith('hanako', true);
    resolve({ ok: true, followersCount: 5 });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('通信が切れてフォローが失敗したら、元に戻してトーストで知らせる（#70）', async () => {
    const add = vi.spyOn(toast, 'add');
    setFollowAction.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    page({ profile: { ...profile, isSelf: false, isFollowing: false, followersCount: 4 } });
    const header = within(screen.getByRole('region', { name: 'プロフィール' }));
    await userEvent.click(header.getByRole('button', { name: 'フォロー' }));
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({ title: '通信できませんでした。もう一度お試しください' }),
    );
    expect(screen.getByRole('region', { name: 'プロフィール' })).toHaveTextContent('4 フォロワー');
  });

  it('フォロー中を押すと解除。失敗したら戻してトースト', async () => {
    const add = vi.spyOn(toast, 'add');
    setFollowAction.mockResolvedValueOnce({
      ok: false,
      code: 'RATE_LIMITED',
      message: 'フォローが多すぎます',
    });
    page({ profile: { ...profile, isSelf: false, isFollowing: true, followersCount: 4 } });
    const header = within(screen.getByRole('region', { name: 'プロフィール' }));
    await userEvent.click(header.getByRole('button', { name: /フォロー中|フォロー解除/ }));
    expect(setFollowAction).toHaveBeenLastCalledWith('hanako', false);
    await waitFor(() => expect(add).toHaveBeenCalledWith({ title: 'フォローが多すぎます' }));
    expect(screen.getByRole('region', { name: 'プロフィール' })).toHaveTextContent('4 フォロワー');
  });

  it('ログインしていなければ、ログインへのリンク', () => {
    page({ signedIn: false, profile: { ...profile, isSelf: false } });
    expect(screen.getByRole('link', { name: 'フォロー' })).toHaveAttribute(
      'href',
      '/i/flow/login?next=%2Fhanako',
    );
  });
});
