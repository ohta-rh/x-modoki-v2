// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeletePostMenu } from './delete-post-menu';

type Action = Parameters<typeof DeletePostMenu>[0]['action'];

async function openConfirm() {
  await userEvent.click(screen.getByRole('button', { name: 'もっと見る' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }));
  return screen.findByRole('alertdialog');
}

describe('DeletePostMenu（#20）', () => {
  it('メニューの「削除」で確認のダイアログを出し、「削除」で消して onDeleted を呼ぶ', async () => {
    const action = vi.fn<Action>(async () => ({ ok: true }));
    const onDeleted = vi.fn();
    render(<DeletePostMenu postId="123" action={action} onDeleted={onDeleted} />);
    const dialog = await openConfirm();
    expect(dialog).toHaveTextContent('ポストを削除しますか？');
    await userEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(action).toHaveBeenCalledWith('123');
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('「キャンセル」では消さない', async () => {
    const action = vi.fn<Action>(async () => ({ ok: true }));
    render(<DeletePostMenu postId="123" action={action} onDeleted={vi.fn()} />);
    await openConfirm();
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(action).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('失敗したら文言を出し、onDeleted を呼ばない', async () => {
    const action = vi.fn<Action>(async () => ({ ok: false, message: 'この投稿は削除できません' }));
    const onDeleted = vi.fn();
    render(<DeletePostMenu postId="123" action={action} onDeleted={onDeleted} />);
    await openConfirm();
    await userEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('この投稿は削除できません');
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
