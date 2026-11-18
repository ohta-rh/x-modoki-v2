// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ComposeModal, ComposePage } from './compose-page';

const router = { push: vi.fn(), back: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const createPostAction = vi.fn(async () => ({ ok: true, id: '7' }));
vi.mock('@/features/post-compose/index.server', () => ({
  createPostAction: (...args: unknown[]) => createPostAction(...(args as [])),
}));

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);
const box = () => screen.getByRole('textbox', { name: '投稿の本文' });

describe('/compose/post（#28）', () => {
  it('モーダル: 閉じると前の画面へ戻る', async () => {
    render(wrap(<ComposeModal username="hanako" />));
    await screen.findByRole('dialog', { name: 'ポストする' });
    await userEvent.keyboard('{Escape}');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('直接開いたページ: 「ポストする」の見出しの下に入力欄。送るとホームへ進む', async () => {
    render(wrap(<ComposePage username="hanako" />));
    expect(screen.getByRole('heading', { name: 'ポストする' })).toBeTruthy();
    await waitFor(() => expect(box()).toBeTruthy());
    await userEvent.type(box(), 'ページから');
    await userEvent.click(screen.getByRole('button', { name: 'ポストする' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/home'));
    expect(createPostAction).toHaveBeenCalledWith('ページから', []);
  });

  it('Next.js が見えないまま取っておいた画面を開き直しても、下書きを読み直した新しい入力欄になる', async () => {
    const tree = (mode: 'visible' | 'hidden') =>
      wrap(
        <Activity mode={mode}>
          <ComposeModal username="hanako" />
        </Activity>,
      );
    const { rerender } = render(tree('visible'));
    await userEvent.type(await screen.findByRole('textbox', { name: '投稿の本文' }), '前の');
    rerender(tree('hidden'));
    act(() => window.localStorage.setItem('x-modoki:compose-draft', '新しい下書き'));
    rerender(tree('visible'));
    await waitFor(() => expect(box()).toHaveValue('新しい下書き'));
  });
});
