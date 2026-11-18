// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardShortcuts } from './keyboard-shortcuts';

const router = { push: vi.fn() };
let pathname = '/home';
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => pathname }));

const like = vi.fn();
const repost = vi.fn();
const open = vi.fn();

function Page() {
  return (
    <main>
      <input aria-label="入力" />
      {[1, 2, 3].map((n) => (
        <article key={n} data-post="card" onClick={() => open(n)}>
          投稿 {n}
          <button
            type="button"
            aria-label="いいね"
            onClick={(event) => {
              event.stopPropagation();
              like(n);
            }}
          />
          <button
            type="button"
            aria-label="リポスト"
            onClick={(event) => {
              event.stopPropagation();
              repost(n);
            }}
          />
        </article>
      ))}
    </main>
  );
}
const press = (key: string, target: Element = document.body) => fireEvent.keyDown(target, { key });
const selected = () => document.activeElement?.closest('article')?.textContent;

beforeEach(() => {
  vi.clearAllMocks();
  pathname = '/home';
  Element.prototype.scrollIntoView = vi.fn();
});

describe('KeyboardShortcuts（#29、ui-ux.md の 10 節）', () => {
  it('n で投稿のモーダル、g のあと h / n / p で移動', () => {
    render(<KeyboardShortcuts username="me" />);
    press('n');
    expect(router.push).toHaveBeenLastCalledWith('/compose/post');
    press('g');
    press('h');
    expect(router.push).toHaveBeenLastCalledWith('/home');
    press('g');
    press('n');
    expect(router.push).toHaveBeenLastCalledWith('/notifications');
    press('g');
    press('p');
    expect(router.push).toHaveBeenLastCalledWith('/me');
  });

  it('入力欄の中のキーは何もしない', () => {
    render(
      <>
        <KeyboardShortcuts username="me" />
        <Page />
      </>,
    );
    press('n', screen.getByRole('textbox', { name: '入力' }));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('j / k で投稿を選んでフォーカスし、画面の中へ入れる。端では止まる', () => {
    render(
      <>
        <KeyboardShortcuts username="me" />
        <Page />
      </>,
    );
    press('k');
    expect(selected()).toBeUndefined();
    press('j');
    expect(selected()).toContain('投稿 1');
    press('j');
    press('j');
    press('j');
    expect(selected()).toContain('投稿 3');
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' });
    press('k');
    expect(selected()).toContain('投稿 2');
  });

  it('l・t は選んだ投稿のいいね・リポストを押す。選んでいなければ何もしない', () => {
    render(
      <>
        <KeyboardShortcuts username="me" />
        <Page />
      </>,
    );
    press('l');
    expect(like).not.toHaveBeenCalled();
    press('j');
    press('j');
    press('l');
    press('t');
    expect(like).toHaveBeenCalledWith(2);
    expect(repost).toHaveBeenCalledWith(2);
  });

  it('r は選んだ投稿を開き、返信の欄が出たらフォーカスする', async () => {
    const { rerender } = render(
      <>
        <KeyboardShortcuts username="me" />
        <Page />
      </>,
    );
    press('r');
    expect(open).not.toHaveBeenCalled();
    press('j');
    press('r');
    expect(open).toHaveBeenCalledWith(1);
    pathname = '/someone/status/1';
    rerender(
      <>
        <KeyboardShortcuts username="me" />
        <textarea aria-label="返信の本文" />
      </>,
    );
    await waitFor(() => expect(screen.getByRole('textbox', { name: '返信の本文' })).toHaveFocus());
  });

  it('返信の欄があとから出ても待ってフォーカスし、出ないままならあきらめる（あとで出た欄は奪わない）', async () => {
    vi.useFakeTimers();
    try {
      const shell = (children: React.ReactNode) => (
        <>
          <KeyboardShortcuts username="me" />
          {children}
        </>
      );
      const { rerender } = render(shell(<Page />));
      press('j');
      press('r');
      pathname = '/a/status/1';
      rerender(shell(null));
      await act(() => vi.advanceTimersByTimeAsync(100));
      rerender(shell(<textarea aria-label="返信の本文" />));
      await act(() => vi.advanceTimersByTimeAsync(100));
      expect(screen.getByRole('textbox', { name: '返信の本文' })).toHaveFocus();

      rerender(shell(<Page />));
      press('j');
      press('r');
      pathname = '/a/status/2';
      rerender(shell(null));
      await act(() => vi.advanceTimersByTimeAsync(5_000));
      rerender(shell(<textarea aria-label="返信の本文" />));
      await act(() => vi.advanceTimersByTimeAsync(100));
      expect(screen.getByRole('textbox', { name: '返信の本文' })).not.toHaveFocus();
    } finally {
      vi.useRealTimers();
    }
  });

  it('引用のカード（投稿の中の article）は選ばない。中で押しても、外の投稿が選ばれている（レビュー 1）', () => {
    render(
      <>
        <KeyboardShortcuts username="me" />
        <main>
          <article data-post="card" onClick={() => open('A')}>
            投稿 A
            <button
              type="button"
              aria-label="いいね"
              onClick={(event) => {
                event.stopPropagation();
                like('A');
              }}
            />
            <article onClick={() => open('引用')}>引用した投稿</article>
          </article>
          <article>投稿 B</article>
        </main>
      </>,
    );
    press('j');
    press('j');
    expect(selected()).toContain('投稿 B');
    press('k');
    expect(selected()).toContain('投稿 A');
    press('l');
    expect(like).toHaveBeenCalledWith('A');
    // Focus inside the quoted card (a link in it, say) still means the post around it.
    like.mockClear();
    const quoted = screen.getByText('引用した投稿');
    quoted.tabIndex = -1;
    quoted.focus();
    press('l');
    expect(like).toHaveBeenCalledWith('A');
  });

  it('詳細の画面の本体で r を押すと、その画面の返信の欄にすぐフォーカスする。あとの移動では奪わない（レビュー 1）', async () => {
    const shell = (children: React.ReactNode) => (
      <>
        <KeyboardShortcuts username="me" />
        {children}
      </>
    );
    const { rerender } = render(
      shell(
        <main>
          <article data-post="main">本体</article>
          <textarea aria-label="返信の本文" />
        </main>,
      ),
    );
    press('j');
    press('r');
    expect(screen.getByRole('textbox', { name: '返信の本文' })).toHaveFocus();
    act(() => (document.activeElement as HTMLElement).blur());
    pathname = '/other/status/9';
    rerender(shell(<textarea aria-label="返信の本文" />));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(screen.getByRole('textbox', { name: '返信の本文' })).not.toHaveFocus();
  });

  it('ダイアログが開いている間は、キーは何もしない（レビュー 3）', () => {
    render(
      <>
        <KeyboardShortcuts username="me" />
        <div role="dialog" aria-label="開いているモーダル">
          <button type="button">中のボタン</button>
        </div>
      </>,
    );
    press('n', screen.getByRole('button', { name: '中のボタン' }));
    press('g');
    press('h');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('開く投稿でない article（通知の行など）で r を押しても、あとの移動でフォーカスを奪わない（レビュー 3）', async () => {
    const shell = (children: React.ReactNode) => (
      <>
        <KeyboardShortcuts username="me" />
        {children}
      </>
    );
    const { rerender } = render(
      shell(
        <main>
          <article>通知の行</article>
        </main>,
      ),
    );
    press('j');
    press('r');
    pathname = '/someone/status/3';
    rerender(shell(<textarea aria-label="返信の本文" />));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(screen.getByRole('textbox', { name: '返信の本文' })).not.toHaveFocus();
  });

  it('? でキーの一覧のダイアログを出す', async () => {
    render(<KeyboardShortcuts username="me" />);
    act(() => {
      press('?');
    });
    const list = await screen.findByRole('dialog', { name: 'キーボードショートカット' });
    expect(list).toHaveTextContent('新しいポスト');
    expect(list).toHaveTextContent('g h');
  });
});
