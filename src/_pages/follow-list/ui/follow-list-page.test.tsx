// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FollowUser, Profile } from '@/entities/user';
import { toast } from '@/shared/ui/toast';
import { FollowListPage } from './follow-list-page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const setFollowAction = vi.fn();
vi.mock('@/features/user-follow/index.server', () => ({
  setFollowAction: (...args: unknown[]) => setFollowAction(...args),
}));

const profile = { username: 'hana', name: '花', postsCount: 0 } as Profile;
const row = (username: string, extra: Partial<FollowUser> = {}): FollowUser => ({
  username,
  name: `名前 ${username}`,
  avatarUrl: null,
  bio: '自己紹介',
  isFollowing: false,
  isSelf: false,
  ...extra,
});
const show = (props: Partial<Parameters<typeof FollowListPage>[0]> = {}) =>
  render(
    // No retries: a failed page shows at once.
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <FollowListPage
        profile={profile}
        type="followers"
        firstPage={{ items: [row('aa'), row('me', { isSelf: true })], nextCursor: null }}
        signedIn
        {...props}
      />
    </QueryClientProvider>,
  );

describe('FollowListPage（#24）', () => {
  it('見出しとタブ（フォロワー / フォロー中）、各行に名前・@・自己紹介・フォローのボタン（自分には無し）', () => {
    show();
    expect(screen.getByRole('heading', { level: 1, name: '花' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'フォロワー' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'フォロー中' })).toHaveAttribute(
      'href',
      '/hana/following',
    );
    const [first, mine] = screen.getAllByRole('listitem');
    for (const part of ['名前 aa', '@aa', '自己紹介']) expect(first).toHaveTextContent(part);
    expect(within(first).getByRole('button', { name: 'フォロー' })).toBeInTheDocument();
    expect(within(mine).queryByRole('button')).toBeNull();
  });

  it('行のフォローはすぐ変わり、失敗したら戻してトースト', async () => {
    const add = vi.spyOn(toast, 'add');
    setFollowAction
      .mockResolvedValueOnce({ ok: true, followersCount: 1 })
      .mockResolvedValueOnce({ ok: false, code: 'RATE_LIMITED', message: 'フォローが多すぎます' });
    show();
    const first = within(screen.getAllByRole('listitem')[0]);
    await userEvent.click(first.getByRole('button', { name: 'フォロー' }));
    expect(setFollowAction).toHaveBeenCalledWith('aa', true);
    expect(first.getByRole('button', { name: 'フォロー中' })).toBeInTheDocument();
    await userEvent.click(first.getByRole('button', { name: /フォロー中|フォロー解除/ }));
    await waitFor(() => expect(add).toHaveBeenCalledWith({ title: 'フォローが多すぎます' }));
    expect(first.getByRole('button', { name: /フォロー中|フォロー解除/ })).toBeInTheDocument();
  });

  it('ログインしていなければ、ログインへのリンク。空なら案内', () => {
    show({
      signedIn: false,
      type: 'following',
      firstPage: { items: [row('aa')], nextCursor: null },
    });
    expect(screen.getByRole('link', { name: 'フォロー' })).toHaveAttribute(
      'href',
      '/i/flow/login?next=%2Fhana%2Ffollowing',
    );
  });

  it('続きがあれば、続きを読む', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ items: [row('cc')], nextCursor: null }));
    vi.stubGlobal('fetch', fetchSpy);
    show({ firstPage: { items: [row('aa')], nextCursor: 'next' } });
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith('/api/users/hana/follows?type=followers&cursor=next'),
    );
    expect(await screen.findByText('@cc')).toBeInTheDocument();
  });

  it('3 ページ目以降も続けて読む（#53）', async () => {
    const pages = [
      { items: [row('bb')], nextCursor: 'c2' },
      { items: [row('cc')], nextCursor: null },
    ];
    const fetchSpy = vi.fn(async () => Response.json(pages.shift()));
    vi.stubGlobal('fetch', fetchSpy);
    show({ firstPage: { items: [row('aa')], nextCursor: 'c1' } });
    expect(await screen.findByText('@cc')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('自己紹介が空の人は、自己紹介の行を出さない', () => {
    show({ firstPage: { items: [row('aa', { bio: '' })], nextCursor: null } });
    expect(screen.getByRole('listitem').querySelector('p')).toBeNull();
  });

  it('空なら案内を出す（フォロワー / フォロー中）', () => {
    const { unmount } = show({ firstPage: { items: [], nextCursor: null } });
    expect(screen.getByText('まだフォロワーがいません')).toBeInTheDocument();
    unmount();
    show({ type: 'following', firstPage: { items: [], nextCursor: null } });
    expect(screen.getByText('まだ誰もフォローしていません')).toBeInTheDocument();
  });

  it('続きが読めなければ、そう知らせる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    show({ firstPage: { items: [row('aa')], nextCursor: 'next' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('続きを読み込めませんでした');
  });
});
