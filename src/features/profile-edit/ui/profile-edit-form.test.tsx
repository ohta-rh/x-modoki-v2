// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileEditForm } from './profile-edit-form';

const initial = { name: '花子', bio: '', location: '', website: '' };

describe('ProfileEditForm（#23）', () => {
  it('今の値を出し、保存で送り、通ったら onSaved', async () => {
    const action = vi.fn(async () => ({ ok: true as const }));
    const onSaved = vi.fn();
    render(<ProfileEditForm initial={initial} action={action} onSaved={onSaved} />);
    expect(screen.getByRole('textbox', { name: '名前' })).toHaveValue('花子');
    await userEvent.type(screen.getByRole('textbox', { name: '自己紹介' }), '猫');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(action).toHaveBeenCalledWith({ ...initial, bio: '猫' });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('項目ごとの文言とほかの文言を出し、onSaved を呼ばない', async () => {
    const onSaved = vi.fn();
    const action = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        code: 'VALIDATION',
        fieldErrors: { website: ['http か https の URL を入れてください'] },
      })
      .mockResolvedValueOnce({
        ok: false,
        code: 'UNAUTHORIZED',
        fieldErrors: {},
        message: 'ログインしてください',
      });
    render(<ProfileEditForm initial={initial} action={action} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText('http か https の URL を入れてください')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'ウェブサイト' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ログインしてください');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
