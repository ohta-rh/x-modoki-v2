// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './home-page';

vi.mock('@/features/post-compose/index.server', () => ({
  createPostAction: async () => ({ ok: true }),
}));

const empty = { items: [], nextCursor: null };
const renderHome = (kind: 'following' | 'for-you') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HomePage kind={kind} firstPage={empty} now="2026-11-18T03:00:00.000Z" />
    </QueryClientProvider>,
  );

describe('HomePage（ui-ux.md の 6 節）', () => {
  it('ヘッダーに「ホーム」、タブは「おすすめ」と「フォロー中」で、選んだタブに 4px の下線', () => {
    renderHome('following');
    expect(screen.getByRole('heading', { level: 1, name: 'ホーム' })).toBeInTheDocument();
    const tabs = screen.getByRole('tablist');
    expect(within(tabs).getByRole('tab', { name: 'おすすめ' })).toHaveAttribute('href', '/home');
    const following = within(tabs).getByRole('tab', { name: 'フォロー中' });
    expect(following).toHaveAttribute('href', '/home?tab=following');
    expect(following).toHaveAttribute('aria-selected', 'true');
    expect(following.querySelector('[data-indicator]')).toHaveClass('h-1', 'bg-brand');
    expect(
      within(tabs).getByRole('tab', { name: 'おすすめ' }).querySelector('[data-indicator]'),
    ).toBeNull();
  });

  it('入力欄とタイムラインを出す', () => {
    renderHome('for-you');
    expect(screen.getByRole('textbox', { name: '投稿の本文' })).toBeInTheDocument();
    expect(screen.getByText('まだポストがありません')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'おすすめ' })).toHaveAttribute('aria-selected', 'true');
  });
});
