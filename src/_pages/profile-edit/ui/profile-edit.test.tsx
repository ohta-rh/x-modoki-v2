// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileEditModal, ProfileEditPage } from './profile-edit';

const router = { push: vi.fn(), back: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const updateProfileAction = vi.fn(async () => ({ ok: true }));
vi.mock('@/features/profile-edit/index.server', () => ({
  updateProfileAction: (...args: unknown[]) => updateProfileAction(...(args as [])),
}));

const data = { username: 'hanako', initial: { name: '花子', bio: '', location: '', website: '' } };

describe('プロフィールの編集の画面（#23）', () => {
  it('モーダル: 「プロフィールを編集」のダイアログ。保存すると前の画面へ戻り、読み直す。閉じると戻る', async () => {
    render(<ProfileEditModal {...data} />);
    const dialog = within(screen.getByRole('dialog', { name: 'プロフィールを編集' }));
    await userEvent.click(dialog.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(router.back).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(router.back).toHaveBeenCalledTimes(2);
  });

  it('ページ: 見出しとフォーム。保存するとプロフィールへ', async () => {
    render(<ProfileEditPage {...data} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'プロフィールを編集' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/hanako'));
  });
});
