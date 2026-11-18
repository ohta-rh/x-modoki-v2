// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DisplaySettings } from './display-settings';

const html = document.documentElement;
afterEach(() => {
  html.removeAttribute('data-theme');
  html.removeAttribute('data-accent');
});

describe('DisplaySettings（#29）', () => {
  it('今の値を選んだ状態で出し、選ぶとすぐ見た目を変えて保存する', async () => {
    const action = vi.fn(async () => ({ ok: true as const }));
    render(<DisplaySettings theme="light" accent="blue" action={action} />);
    expect(screen.getByRole('radio', { name: 'デフォルト' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '青' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'ダークブルー' }));
    expect(html.dataset.theme).toBe('dim');
    expect(action).toHaveBeenLastCalledWith({ theme: 'dim', accent: 'blue' });
    await userEvent.click(screen.getByRole('radio', { name: 'ピンク' }));
    expect(html.dataset.accent).toBe('pink');
    expect(action).toHaveBeenLastCalledWith({ theme: 'dim', accent: 'pink' });
    expect(screen.getAllByRole('radio')).toHaveLength(9);
  });

  it('保存できなければ、元の見た目に戻して知らせる', async () => {
    const action = vi.fn(async () => ({ ok: false as const, error: 'UNAUTHORIZED' as const }));
    render(<DisplaySettings theme="light" accent="blue" action={action} />);
    await userEvent.click(screen.getByRole('radio', { name: 'ブラック' }));
    await waitFor(() => expect(html.dataset.theme).toBe('light'));
    expect(screen.getByRole('radio', { name: 'デフォルト' })).toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent('保存できませんでした');
  });
});
