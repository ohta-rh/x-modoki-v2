// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClearBookmarksMenu } from './clear-bookmarks-menu';

const open = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'ブックマークのメニュー' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'ブックマークを全て削除' }));
  return within(await screen.findByRole('alertdialog'));
};

describe('ClearBookmarksMenu（#21）', () => {
  it('メニューから確認して全て削除し、onCleared を呼ぶ。キャンセルでは消さない', async () => {
    const action = vi.fn(async () => ({ ok: true as const }));
    const onCleared = vi.fn();
    render(<ClearBookmarksMenu action={action} onCleared={onCleared} />);
    let dialog = await open();
    expect(dialog.getByText('ブックマークを全て削除しますか？')).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'キャンセル' }));
    expect(action).not.toHaveBeenCalled();
    dialog = await open();
    await userEvent.click(dialog.getByRole('button', { name: '削除' }));
    await waitFor(() => expect(onCleared).toHaveBeenCalled());
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('失敗したら文言を出し、onCleared を呼ばない', async () => {
    const onCleared = vi.fn();
    render(
      <ClearBookmarksMenu
        action={async () => ({ ok: false, message: 'ログインしてください' })}
        onCleared={onCleared}
      />,
    );
    const dialog = await open();
    await userEvent.click(dialog.getByRole('button', { name: '削除' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('ログインしてください');
    expect(onCleared).not.toHaveBeenCalled();
  });
});
