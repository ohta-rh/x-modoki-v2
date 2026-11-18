// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BookmarksPage } from './bookmarks-page';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock('@/features/post-like/index.server', () => ({
  setLikeAction: async () => ({ ok: true, count: 1 }),
}));
vi.mock('@/features/post-bookmark/index.server', () => ({
  setBookmarkAction: async () => ({ ok: true, count: 1 }),
  clearBookmarksAction: async () => ({ ok: true }),
}));
vi.mock('@/features/post-delete/index.server', () => ({
  deletePostAction: async () => ({ ok: true }),
}));

describe('BookmarksPage（#21）', () => {
  it('見出し「ブックマーク」と自分のユーザー名、メニュー、空なら案内', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookmarksPage
          username="hanako"
          now="2026-11-18T03:00:00.000Z"
          firstPage={{ items: [], nextCursor: null }}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'ブックマーク' })).toBeInTheDocument();
    expect(screen.getByText('@hanako')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ブックマークのメニュー' })).toBeInTheDocument();
    expect(screen.getByText('まだブックマークがありません')).toBeInTheDocument();
  });

  it('全て削除すると、一覧を読み直し、画面も読み直す', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ items: [], nextCursor: null }));
    vi.stubGlobal('fetch', fetchSpy);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookmarksPage
          username="hanako"
          now="2026-11-18T03:00:00.000Z"
          firstPage={{ items: [], nextCursor: null }}
        />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'ブックマークのメニュー' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'ブックマークを全て削除' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '削除' }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchSpy).toHaveBeenCalledWith('/api/bookmarks?cursor=');
  });
});
