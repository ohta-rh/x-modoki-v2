// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/shared/ui/toast';
import { UserResults } from './user-results';

afterEach(() => vi.unstubAllGlobals());

const person = (username: string) => ({
  username,
  name: `名前 ${username}`,
  avatarUrl: null,
  bio: username === 'me' ? '' : `${username} の自己紹介`,
  isFollowing: false,
  isSelf: username === 'me',
});

const show = (props: Partial<Parameters<typeof UserResults>[0]> = {}) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <UserResults
        q="名前"
        firstPage={{ items: [person('aa'), person('me')], nextCursor: null }}
        action={vi.fn(async () => ({ ok: true }) as const) as never}
        {...props}
      />
    </QueryClientProvider>,
  );

describe('UserResults（#27）', () => {
  it('名前・ユーザー名・自己紹介・フォローのボタン（自分には無し）。押すとすぐ変わる', async () => {
    const action = vi.fn(async () => ({ ok: true }) as const);
    show({ action: action as never });
    // The avatar and the name both open the profile.
    for (const link of screen.getAllByRole('link', { name: /名前 aa/ })) {
      expect(link).toHaveAttribute('href', '/aa');
    }
    expect(screen.getByText('aa の自己紹介')).toBeInTheDocument();
    // An empty bio draws no paragraph.
    expect(screen.getByText('@me').closest('li')!.querySelector('p')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'フォロー' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'フォロー' }));
    expect(action).toHaveBeenCalledWith('aa', true);
    expect(screen.getByRole('button', { name: 'フォロー中' })).toBeInTheDocument();
  });

  it('通信が切れてフォローが失敗したら、元に戻してトーストで知らせる。断られたときも知らせる（#70）', async () => {
    const add = vi.spyOn(toast, 'add');
    const action = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ok: false, message: 'だめ' });
    show({ action: action as never });
    await userEvent.click(screen.getByRole('button', { name: 'フォロー' }));
    await vi.waitFor(() =>
      expect(add).toHaveBeenCalledWith({ title: '通信できませんでした。もう一度お試しください' }),
    );
    expect(screen.getByRole('button', { name: 'フォロー' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'フォロー' }));
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith({ title: 'だめ' }));
  });

  it('フォローが失敗したら戻す。ログインしていなければログインへのリンク', async () => {
    const action = vi.fn(async () => ({ ok: false, message: 'だめ' }) as const);
    const { unmount } = show({ action: action as never });
    await userEvent.click(screen.getByRole('button', { name: 'フォロー' }));
    expect(await screen.findByRole('button', { name: 'フォロー' })).toBeInTheDocument();
    unmount();
    show({ action: undefined, loginHref: '/i/flow/login' });
    expect(screen.getAllByRole('link', { name: 'フォロー' })[0]).toHaveAttribute(
      'href',
      '/i/flow/login',
    );
  });

  it('続きを q とカーソル付きで読む。誰もいなければ案内。読めなければ知らせる', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ items: [person('bb')], nextCursor: 'c2' }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    const { unmount } = show({ firstPage: { items: [person('aa')], nextCursor: 'c1' } });
    expect(await screen.findByText('@bb')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/search?q=${encodeURIComponent('名前')}&f=user&cursor=c1`,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('続きを読み込めませんでした');
    unmount();
    show({ firstPage: { items: [], nextCursor: null } });
    expect(screen.getByText('「名前」に一致するユーザーはいません')).toBeInTheDocument();
  });
});
