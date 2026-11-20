// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsPage } from './notifications-page';

vi.mock('@/features/notifications-read/index.server', () => ({
  markNotificationsReadAction: async () => ({ ok: true }),
}));

const show = (tab: 'all' | 'mentions') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NotificationsPage
        tab={tab}
        firstPage={{
          items: [
            {
              id: '9',
              type: 'follow',
              createdAt: '2026-11-18T03:00:00.000Z',
              read: false,
              actor: { username: 'hana', name: '花子', avatarUrl: null },
              post: null,
            },
          ],
          nextCursor: null,
        }}
      />
    </QueryClientProvider>,
  );

describe('NotificationsPage（#26）', () => {
  it('見出し「通知」、タブ（すべて / メンション）、その下に通知', () => {
    show('all');
    expect(screen.getByRole('heading', { level: 1, name: '通知' })).toBeInTheDocument();
    const tabs = within(screen.getByRole('tablist'));
    expect(tabs.getByRole('tab', { name: 'すべて' })).toHaveAttribute('href', '/notifications');
    expect(tabs.getByRole('tab', { name: 'すべて' })).toHaveAttribute('aria-selected', 'true');
    expect(tabs.getByRole('tab', { name: 'メンション' })).toHaveAttribute(
      'href',
      '/notifications/mentions',
    );
    expect(screen.getByRole('article')).toHaveTextContent('花子さんにフォローされました');
  });

  it('メンションのタブを選んでいる', () => {
    show('mentions');
    expect(screen.getByRole('tab', { name: 'メンション' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'すべて' })).toHaveAttribute('aria-selected', 'false');
  });
});
