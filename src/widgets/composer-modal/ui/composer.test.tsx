// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/shared/ui/toast';
import { ComposerDialog, ComposerScreen } from './composer';

type Action = Parameters<typeof ComposerDialog>[0]['action'];
const posted = () => vi.fn<Action>(async () => ({ ok: true, id: '42' }));
const DRAFT = 'x-modoki:compose-draft:me'; // one per person (#79)

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
const box = () => screen.getByRole('textbox', { name: '投稿の本文' });

afterEach(() => window.localStorage.clear());

describe('ComposerDialog（#28、ui-ux.md の 7 節）', () => {
  it('「ポストする」という名前のモーダルで、入力欄にフォーカスがある。空のまま閉じると何も聞かない', async () => {
    const onClose = vi.fn();
    render(wrap(<ComposerDialog username="me" action={posted()} onClose={onClose} />));
    expect(await screen.findByRole('dialog', { name: 'ポストする' })).toBeTruthy();
    await waitFor(() => expect(box()).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('書いてから閉じると「破棄 / 保存」を聞き、保存すると下書きを残して閉じる', async () => {
    const onClose = vi.fn();
    render(wrap(<ComposerDialog username="me" action={posted()} onClose={onClose} />));
    await userEvent.type(await screen.findByRole('textbox', { name: '投稿の本文' }), '書きかけ');
    await userEvent.keyboard('{Escape}');
    const ask = await screen.findByRole('alertdialog', { name: 'ポストを保存しますか？' });
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(DRAFT)).toBe('書きかけ');
    expect(ask).toBeTruthy();
  });

  it('聞かれたところで Esc を押すと、書きかけのままモーダルに残る', async () => {
    const onClose = vi.fn();
    render(wrap(<ComposerDialog username="me" action={posted()} onClose={onClose} />));
    await userEvent.type(await screen.findByRole('textbox', { name: '投稿の本文' }), '途中');
    await userEvent.keyboard('{Escape}');
    const ask = await screen.findByRole('alertdialog');
    // Focus moves into the question in the next frame; Esc before that is the composer's.
    await waitFor(() => expect(ask.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(box()).toHaveValue('途中');
    expect(window.localStorage.getItem(DRAFT)).toBeNull();
  });

  it('送っている間は閉じない（答えてから送り終わると、2 回戻ってしまう、レビュー 1）', async () => {
    const onClose = vi.fn();
    const never = vi.fn<Action>(() => new Promise(() => {}));
    render(wrap(<ComposerDialog username="me" action={never} onClose={onClose} />));
    await userEvent.type(await screen.findByRole('textbox', { name: '投稿の本文' }), '送る途中');
    await userEvent.click(screen.getByRole('button', { name: 'ポストする' }));
    expect(never).toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('画像だけで本文が無ければ、保存は出さず破棄だけを聞く（保存するのは本文だけ、レビュー 1）', async () => {
    const onClose = vi.fn();
    render(wrap(<ComposerDialog username="me" action={posted()} onClose={onClose} />));
    const box = await screen.findByRole('textbox', { name: '投稿の本文' });
    await userEvent.type(box, 'x');
    await userEvent.clear(box);
    await userEvent.upload(
      screen.getByLabelText('画像を追加'),
      new File([new Uint8Array([137, 80, 78, 71])], 'a.png', { type: 'image/png' }),
    );
    await userEvent.keyboard('{Escape}');
    const ask = await screen.findByRole('alertdialog', { name: 'ポストを破棄しますか？' });
    expect(ask).toHaveTextContent('画像は保存されません');
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull();
  });

  it('破棄すると下書きを消して閉じる', async () => {
    window.localStorage.setItem(DRAFT, '前の下書き');
    const onClose = vi.fn();
    render(wrap(<ComposerDialog username="me" action={posted()} onClose={onClose} />));
    await waitFor(() => expect(box()).toHaveValue('前の下書き'));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(await screen.findByRole('button', { name: '破棄' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(DRAFT)).toBeNull();
  });

  it('送ると下書きを消して閉じ、「ポストを送信しました」と、その投稿への「表示」のリンクを出す', async () => {
    window.localStorage.setItem(DRAFT, '送る下書き');
    const action = posted();
    const onClose = vi.fn();
    render(wrap(<ComposerDialog username="me" action={action} onClose={onClose} />));
    await waitFor(() => expect(box()).toHaveValue('送る下書き'));
    await userEvent.click(screen.getByRole('button', { name: 'ポストする' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith('送る下書き', []);
    expect(window.localStorage.getItem(DRAFT)).toBeNull();
    expect(await screen.findByText('ポストを送信しました')).toBeTruthy();
    expect(screen.getByRole('link', { name: '表示' })).toHaveAttribute('href', '/me/status/42');
  });
});

describe('ComposerDialog のフォーカスの戻し先（#28）', () => {
  const client = new QueryClient();
  // The same tree, with and without the dialog: what was on screen stays the same DOM.
  const Screen = ({ open, children }: { open: boolean; children: ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
      {open ? <ComposerDialog username="me" action={posted()} onClose={vi.fn()} /> : null}
    </QueryClientProvider>
  );

  it('外れると、開く前にフォーカスのあった要素へ戻す', async () => {
    const opener = <button type="button">開く</button>;
    const { rerender } = render(<Screen open={false}>{opener}</Screen>);
    const button = screen.getByRole('button', { name: '開く' });
    // jsdom lays nothing out: give the button a box, as a shown element has.
    button.getClientRects = () => [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList;
    button.focus();
    rerender(<Screen open>{opener}</Screen>);
    await waitFor(() => expect(box()).toHaveFocus());
    rerender(<Screen open={false}>{opener}</Screen>);
    await waitFor(() => expect(screen.getByRole('button', { name: '開く' })).toHaveFocus());
  });

  it('開く前にどこにもフォーカスが無ければ（Safari はリンクを押してもフォーカスしない）、見えている投稿ボタンへ戻す', async () => {
    const links = (
      <>
        <Link href="/compose/post" aria-label="隠れたポストする" />
        <Link href="/compose/post" aria-label="ポストする" />
      </>
    );
    const { rerender } = render(<Screen open={false}>{links}</Screen>);
    // jsdom lays nothing out: only the second link has a box.
    const shown = screen.getByRole('link', { name: 'ポストする' });
    shown.getClientRects = () => [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList;
    rerender(<Screen open>{links}</Screen>);
    await waitFor(() => expect(box()).toHaveFocus());
    rerender(<Screen open={false}>{links}</Screen>);
    await waitFor(() => expect(shown).toHaveFocus());
  });
});

describe('ComposerScreen（#28、/compose/post を直接開いたとき）', () => {
  it('下書きの入った入力欄を出し、送るとトーストを出して知らせる', async () => {
    window.localStorage.setItem(DRAFT, 'ページの下書き');
    const onPosted = vi.fn();
    render(wrap(<ComposerScreen username="me" action={posted()} onPosted={onPosted} />));
    await waitFor(() => expect(box()).toHaveValue('ページの下書き'));
    await userEvent.click(screen.getByRole('button', { name: 'ポストする' }));
    await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('ポストを送信しました')).toBeTruthy();
    expect(window.localStorage.getItem(DRAFT)).toBeNull();
  });

  it('サーバーでは入力欄を出さない（下書きはブラウザの中にしか無く、読めるまで中身が決まらない）', () => {
    window.localStorage.setItem(DRAFT, 'ブラウザの下書き');
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <ComposerScreen username="me" action={posted()} onPosted={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(html).not.toContain('<textarea');
  });
});
