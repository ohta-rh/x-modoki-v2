// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
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

  it('保存の通信そのものが失敗しても、元に戻して知らせる（レビュー 1）', async () => {
    const action = vi.fn(async () => {
      throw new Error('offline');
    });
    render(<DisplaySettings theme="light" accent="blue" action={action} />);
    await userEvent.click(screen.getByRole('radio', { name: 'ブラック' }));
    await waitFor(() => expect(html.dataset.theme).toBe('light'));
    expect(screen.getByRole('alert')).toHaveTextContent('保存できませんでした');
  });

  it('動き出す前に選んだものも取り込んで、見た目を変えて保存する（ADR-0044、レビュー 1）', async () => {
    const action = vi.fn(async () => ({ ok: true as const }));
    const ui = <DisplaySettings theme="light" accent="blue" action={action} />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(ui);
    document.body.append(container);
    (container.querySelector('input[value="dim"]') as HTMLInputElement).checked = true;
    await act(async () => {
      hydrateRoot(container, ui);
    });
    await waitFor(() => expect(action).toHaveBeenCalledWith({ theme: 'dim', accent: 'blue' }));
    expect(html.dataset.theme).toBe('dim');
    container.remove();
  });

  it('前の保存が失敗しても、あとの選択がまだ残っていれば戻さない（レビュー 2）', async () => {
    let failFirst!: () => void;
    const action = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            failFirst = () => resolve({ ok: false, error: 'UNAUTHORIZED' });
          }),
      )
      .mockImplementationOnce(async () => ({ ok: true }));
    render(<DisplaySettings theme="light" accent="blue" action={action} />);
    await userEvent.click(screen.getByRole('radio', { name: 'ダークブルー' }));
    await userEvent.click(screen.getByRole('radio', { name: 'ピンク' }));
    await act(async () => failFirst());
    expect(html.dataset.theme).toBe('dim');
    expect(html.dataset.accent).toBe('pink');
    expect(screen.getByRole('radio', { name: 'ピンク' })).toBeChecked();
  });
});
