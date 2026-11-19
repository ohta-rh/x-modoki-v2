// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComposeBox } from './compose-box';

// The parser that weighs a post is loaded on its own, only when someone starts to write (#32).
const { loaded } = vi.hoisted(() => ({ loaded: vi.fn() }));
vi.mock('@/shared/lib/text-parse', async (importOriginal) => {
  loaded();
  return importOriginal();
});

beforeEach(() => loaded.mockClear());

// NFR-PERF-05: 最初に送る JavaScript に、投稿を数える仕組みを入れない
describe('ComposeBox の文字数の数え（#32）', () => {
  it('入力欄に触れるまで数える仕組みを読み込まず、触れたら読み込んで数える', async () => {
    render(<ComposeBox action={vi.fn()} />);
    const box = screen.getByRole('textbox', { name: '投稿の本文' });
    const post = screen.getByRole('button', { name: 'ポストする' });
    expect(loaded).not.toHaveBeenCalled();
    await userEvent.click(box);
    await waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
    await userEvent.type(box, 'あ'.repeat(141));
    expect(post).toBeDisabled();
    expect(screen.getByText('-2')).toBeInTheDocument();
    await userEvent.type(box, '{Backspace}');
    expect(post).toBeEnabled();
  });

  it('最初から本文があるときは、すぐ読み込んで数える', async () => {
    render(<ComposeBox action={vi.fn()} initialText={'あ'.repeat(141)} />);
    // Nothing focused or typed: only the text already in the box starts the load, and the count
    // shows only once the parser is here.
    expect(await screen.findByText('-2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ポストする' })).toBeDisabled();
  });

  it('数える仕組みが届く前に打って押しても、投稿できる（上限はサーバーが確かめる）', async () => {
    vi.resetModules();
    // A slow network: the parser is still on its way when the person presses ポストする.
    vi.doMock('@/shared/lib/text-parse', async (importOriginal) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return importOriginal();
    });
    const { ComposeBox: Slow } = await import('./compose-box');
    const action = vi.fn(async () => ({ ok: true as const, id: '1', username: 'u' }));
    render(<Slow action={action} />);
    await userEvent.type(screen.getByRole('textbox', { name: '投稿の本文' }), '意見');
    await userEvent.click(screen.getByRole('button', { name: 'ポストする' }));
    expect(action).toHaveBeenCalledWith('意見', []);
    vi.doUnmock('@/shared/lib/text-parse');
  });
});
