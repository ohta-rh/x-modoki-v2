// @vitest-environment jsdom
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { redirect } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/shared/ui/toast';
import { MobileAccountDrawer } from './mobile-account-drawer';

const account = { name: 'サンプル 01', username: 'sample01', image: null };

// jsdom has no matchMedia: a stand-in whose change can be fired by hand (#87).
const listeners = new Set<(event: { matches: boolean }) => void>();
beforeEach(() => {
  listeners.clear();
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    matches: false,
    addEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
      listeners.delete(listener),
  }));
});
afterEach(() => vi.unstubAllGlobals());

const openDrawer = async () => {
  await userEvent.click(
    screen.getByRole('button', { name: 'サンプル 01 @sample01 のアカウントのメニュー' }),
  );
  return within(await screen.findByRole('dialog', { name: 'アカウント' }));
};

describe('MobileAccountDrawer（640px 未満のヘッダーのアバター、ui-ux.md の 2 節、#85）', () => {
  it('640px 未満だけに出るアバターのボタンで、名前・@ユーザー名・プロフィール・ブックマーク・設定の引き出しを開く', async () => {
    render(<MobileAccountDrawer account={account} signOut={vi.fn()} />);
    const button = screen.getByRole('button', { name: /のアカウントのメニュー$/ });
    expect(button.closest('[data-mobile-account]')).toHaveClass('sm:hidden');
    const drawer = await openDrawer();
    expect(drawer.getByText('サンプル 01')).toBeInTheDocument();
    expect(drawer.getByText('@sample01')).toBeInTheDocument();
    expect(drawer.getByRole('link', { name: 'プロフィール' })).toHaveAttribute('href', '/sample01');
    expect(drawer.getByRole('link', { name: 'ブックマーク' })).toHaveAttribute(
      'href',
      '/i/bookmarks',
    );
    expect(drawer.getByRole('link', { name: '設定' })).toHaveAttribute('href', '/settings');
  });

  it('リンクを押すと引き出しを閉じる', async () => {
    render(<MobileAccountDrawer account={account} signOut={vi.fn()} />);
    const drawer = await openDrawer();
    await userEvent.click(drawer.getByRole('link', { name: '設定' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'アカウント' })).toBeNull());
  });

  it('ログアウトを押すと signOut を呼ぶ。通信が切れていればトーストで知らせ、移動（redirect）なら何も出さない', async () => {
    const add = vi.spyOn(toast, 'add');
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const { unmount } = render(<MobileAccountDrawer account={account} signOut={offline} />);
    await userEvent.click((await openDrawer()).getByRole('button', { name: 'ログアウト' }));
    expect(offline).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({ title: '通信できませんでした。もう一度お試しください' }),
    );
    unmount();
    add.mockClear();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const moved = vi.fn(async () => {
      redirect('/');
    });
    render(<MobileAccountDrawer account={account} signOut={moved} />);
    await userEvent.click((await openDrawer()).getByRole('button', { name: 'ログアウト' }));
    await new Promise((done) => setTimeout(done, 20));
    process.off('unhandledRejection', unhandled);
    expect(moved).toHaveBeenCalledTimes(1);
    expect(add).not.toHaveBeenCalled();
  });

  it('開いたまま 640px 以上になると閉じ、640px 未満のままの変化では閉じない（#87）', async () => {
    render(<MobileAccountDrawer account={account} signOut={vi.fn()} />);
    await openDrawer();
    act(() => listeners.forEach((listener) => listener({ matches: false })));
    expect(screen.getByRole('dialog', { name: 'アカウント' })).toBeInTheDocument();
    act(() => listeners.forEach((listener) => listener({ matches: true })));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'アカウント' })).toBeNull());
    expect(listeners.size).toBe(0);
  });
});
