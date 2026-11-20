// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import { toast } from '@/shared/ui/toast';
import { AccountMenu } from './account-menu';

const account = { name: 'サンプル 01', username: 'sample01', image: null };

describe('AccountMenu（ui-ux.md の 3 節: アカウントの切り替え）', () => {
  it('アバター・名前・@ユーザー名を出し、開くとログアウトの項目がある', async () => {
    const signOut = vi.fn(async () => undefined);
    render(<AccountMenu account={account} signOut={signOut} />);
    const trigger = screen.getByRole('button', { name: /アカウントのメニュー/ });
    expect(trigger).toHaveTextContent('サンプル 01');
    expect(trigger).toHaveTextContent('@sample01');
    expect(screen.getByRole('img', { name: 'サンプル 01' })).toBeInTheDocument();
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('menuitem', { name: '@sample01からログアウト' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  // NFR-A11Y-06: 名前は見えている文字を含む（WCAG 2.5.3）
  it('ボタンの名前は、見えている名前と @ユーザー名を含む（#31）', () => {
    render(<AccountMenu account={account} signOut={vi.fn()} />);
    expect(screen.getByRole('button', { name: /アカウントのメニュー/ })).toHaveAccessibleName(
      'サンプル 01 @sample01 のアカウントのメニュー',
    );
  });

  it('通信が切れてログアウトできなければ、トーストで知らせる（#82）', async () => {
    const add = vi.spyOn(toast, 'add');
    const signOut = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    render(<AccountMenu account={account} signOut={signOut} />);
    await userEvent.click(screen.getByRole('button', { name: /アカウントのメニュー/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '@sample01からログアウト' }));
    await vi.waitFor(() =>
      expect(add).toHaveBeenCalledWith({ title: '通信できませんでした。もう一度お試しください' }),
    );
  });

  it('ログアウトできて移るとき（redirect で拒まれる）は、通信のトーストを出さない（#82 のレビュー 1）', async () => {
    const add = vi.spyOn(toast, 'add');
    add.mockClear();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const signOut = vi.fn(async () => {
      redirect('/');
    });
    render(<AccountMenu account={account} signOut={signOut} />);
    await userEvent.click(screen.getByRole('button', { name: /アカウントのメニュー/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '@sample01からログアウト' }));
    await new Promise((done) => setTimeout(done, 20));
    process.off('unhandledRejection', unhandled);
    expect(add).not.toHaveBeenCalled();
  });
});
