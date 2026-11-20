// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { toast } from '@/shared/ui/toast';
import { PinMenuItem } from './pin-menu-item';

const open = async (item: React.ReactNode) => {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>メニュー</DropdownMenuTrigger>
      <DropdownMenuContent>{item}</DropdownMenuContent>
    </DropdownMenu>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'メニュー' }));
};

describe('PinMenuItem（#23）', () => {
  it('固定していなければ「プロフィールに固定する」で固定し、終わったら onDone', async () => {
    const action = vi.fn(async () => ({ ok: true as const }));
    const onDone = vi.fn();
    await open(<PinMenuItem postId="1" pinned={false} action={action} onDone={onDone} />);
    await userEvent.click(await screen.findByRole('menuitem', { name: 'プロフィールに固定する' }));
    expect(action).toHaveBeenCalledWith('1', true);
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('固定済みなら「固定を解除」。失敗したらトーストで知らせ、onDone を呼ばない', async () => {
    const add = vi.spyOn(toast, 'add');
    const action = vi.fn(async () => ({
      ok: false as const,
      code: 'FORBIDDEN' as const,
      message: 'この投稿は固定できません',
    }));
    const onDone = vi.fn();
    await open(<PinMenuItem postId="1" pinned action={action} onDone={onDone} />);
    await userEvent.click(await screen.findByRole('menuitem', { name: '固定を解除' }));
    expect(action).toHaveBeenCalledWith('1', false);
    await waitFor(() => expect(add).toHaveBeenCalledWith({ title: 'この投稿は固定できません' }));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('通信が切れて action が失敗したら、トーストで知らせ、onDone を呼ばない（#70）', async () => {
    const add = vi.spyOn(toast, 'add');
    const action = vi.fn(async (): Promise<{ ok: true }> => {
      throw new TypeError('Failed to fetch');
    });
    const onDone = vi.fn();
    await open(<PinMenuItem postId="1" pinned={false} action={action} onDone={onDone} />);
    await userEvent.click(await screen.findByRole('menuitem', { name: 'プロフィールに固定する' }));
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({ title: '通信できませんでした。もう一度お試しください' }),
    );
    expect(onDone).not.toHaveBeenCalled();
  });
});
