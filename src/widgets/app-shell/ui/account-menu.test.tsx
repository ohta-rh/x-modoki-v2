// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccountMenu } from './account-menu';

const account = { name: 'サンプル 01', username: 'sample01', image: null };

describe('AccountMenu（ui-ux.md の 3 節: アカウントの切り替え）', () => {
  it('アバター・名前・@ユーザー名を出し、開くとログアウトの項目がある', async () => {
    const signOut = vi.fn(async () => undefined);
    render(<AccountMenu account={account} signOut={signOut} />);
    const trigger = screen.getByRole('button', { name: 'アカウントのメニュー' });
    expect(trigger).toHaveTextContent('サンプル 01');
    expect(trigger).toHaveTextContent('@sample01');
    expect(screen.getByRole('img', { name: 'サンプル 01' })).toBeInTheDocument();
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('menuitem', { name: '@sample01からログアウト' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
