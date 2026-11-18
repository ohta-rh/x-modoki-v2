// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ComposeBox } from './compose-box';

const box = () => screen.getByRole('textbox', { name: '投稿の本文' });
const button = () => screen.getByRole('button', { name: 'ポストする' });
type Action = Parameters<typeof ComposeBox>[0]['action'];
const ok = () => vi.fn<Action>(async () => ({ ok: true }));

describe('ComposeBox（ui-ux.md の 7 節）', () => {
  it('空のときは押せず、書けば押せる', async () => {
    render(<ComposeBox action={ok()} />);
    expect(button()).toBeDisabled();
    await userEvent.type(box(), 'こんにちは');
    expect(button()).toBeEnabled();
  });

  it('残り 20 で輪が黄色になって数字が出て、0 未満で赤と負の数になり、押せない', () => {
    render(<ComposeBox action={ok()} />);
    fireEvent.change(box(), { target: { value: 'a'.repeat(259) } });
    expect(screen.queryByTestId('remaining')).toBeNull();
    expect(screen.getByTestId('ring')).toHaveAttribute('data-state', 'normal');
    fireEvent.change(box(), { target: { value: 'a'.repeat(260) } });
    expect(screen.getByTestId('remaining')).toHaveTextContent('20');
    expect(screen.getByTestId('ring')).toHaveAttribute('data-state', 'warning');
    fireEvent.change(box(), { target: { value: 'a'.repeat(281) } });
    expect(screen.getByTestId('remaining')).toHaveTextContent('-1');
    expect(screen.getByTestId('ring')).toHaveAttribute('data-state', 'over');
    expect(button()).toBeDisabled();
  });

  it('入力欄は内容に合わせて伸びる', () => {
    render(<ComposeBox action={ok()} />);
    Object.defineProperty(box(), 'scrollHeight', { configurable: true, value: 120 });
    fireEvent.change(box(), { target: { value: '1\n2\n3\n4' } });
    expect(box().style.height).toBe('120px');
  });

  it('送ると action に本文を渡し、空にして onPosted を呼ぶ', async () => {
    const action = ok();
    const onPosted = vi.fn();
    render(<ComposeBox action={action} onPosted={onPosted} />);
    await userEvent.type(box(), 'こんにちは');
    await userEvent.click(button());
    expect(action).toHaveBeenCalledWith('こんにちは', []);
    expect(box()).toHaveValue('');
    expect(onPosted).toHaveBeenCalledTimes(1);
  });

  it('失敗したら文言を alert で出し、本文を残す', async () => {
    const action = vi.fn<Action>(async () => ({ ok: false, message: '投稿が多すぎます' }));
    render(<ComposeBox action={action} />);
    await userEvent.type(box(), 'こんにちは');
    await userEvent.click(button());
    expect(await screen.findByRole('alert')).toHaveTextContent('投稿が多すぎます');
    expect(box()).toHaveValue('こんにちは');
  });

  it('見出し・ボタン・仮の文を変えられる（返信の入力欄）', () => {
    render(
      <ComposeBox action={ok()} label="返信の本文" submitLabel="返信" placeholder="返信をポスト" />,
    );
    expect(screen.getByRole('textbox', { name: '返信の本文' })).toHaveAttribute(
      'placeholder',
      '返信をポスト',
    );
    expect(screen.getByRole('button', { name: '返信' })).toBeInTheDocument();
  });
});

describe('ComposeBox のハイドレーション（#47）', () => {
  it('ハイドレーションの前に打った文字も、状態に入り、投稿できる', async () => {
    const { renderToString } = await import('react-dom/server');
    const { hydrateRoot } = await import('react-dom/client');
    const { act } = await import('react');
    const action = vi.fn(async () => ({ ok: true as const }));
    const container = document.createElement('div');
    container.innerHTML = renderToString(<ComposeBox action={action} />);
    document.body.append(container);
    // Typed before React took over the page.
    container.querySelector('textarea')!.value = '早く打った';
    await act(async () => {
      hydrateRoot(container, <ComposeBox action={action} />);
    });
    const button = screen.getByRole('button', { name: 'ポストする' });
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(action).toHaveBeenCalledWith('早く打った', []);
    container.remove();
  });
});

describe('ComposeBox の画像（#25）', () => {
  const attachments = (over: Partial<{ count: number; ready: boolean }> = {}) => ({
    node: <p>添付の部品</p>,
    media: [{ id: '7', alt: '青' }],
    count: 1,
    ready: true,
    clear: vi.fn(),
    ...over,
  });

  it('画像があれば本文が空でも送れ、本文と画像を渡し、送れたら画像を空にする', async () => {
    const action = ok();
    const attached = attachments();
    render(<ComposeBox action={action} attachments={attached} />);
    expect(screen.getByText('添付の部品')).toBeInTheDocument();
    // A row of its own above the footer, so the previews never squeeze the button (Chrome, #25).
    expect(button().parentElement).not.toContainElement(screen.getByText('添付の部品'));
    expect(button()).toBeEnabled();
    await userEvent.click(button());
    expect(action).toHaveBeenCalledWith('', [{ id: '7', alt: '青' }]);
    await waitFor(() => expect(attached.clear).toHaveBeenCalled());
  });

  it('画像を送り終えるまで（ready でない間）は送れない', () => {
    render(<ComposeBox action={ok()} attachments={attachments({ ready: false })} />);
    expect(button()).toBeDisabled();
  });
});
