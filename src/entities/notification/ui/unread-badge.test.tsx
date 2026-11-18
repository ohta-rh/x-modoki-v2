// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import Link from 'next/link';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnreadBadge } from './unread-badge';

const fetchCount = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  fetchCount.mockReset();
  vi.stubGlobal('fetch', (url: string) => {
    fetchCount(url);
    return Promise.resolve(Response.json({ count: 3 }));
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

const show = (initial: number) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Link href="/notifications">
        通知
        <UnreadBadge initial={initial} />
      </Link>
    </QueryClientProvider>,
  );

describe('UnreadBadge（#26）', () => {
  it('未読が無ければ何も出さず、あれば数と「未読 N 件」を出す', () => {
    const { unmount } = show(0);
    expect(screen.getByRole('link')).toHaveAccessibleName('通知');
    unmount();
    show(2);
    expect(screen.getByRole('link')).toHaveAccessibleName('通知 未読 2 件');
    expect(screen.getByRole('link')).toHaveTextContent('2');
    // The brand blue, as on X (`accent` is the grey hover colour in this theme).
    expect(screen.getByText('2', { exact: false }).closest('span')).toHaveClass('bg-brand');
  });

  // NFR-PERF-07: 新着と未読の確認の GET は 30 秒に 1 回で、タブが見えていない間は送らない
  it('30 秒ごとに確かめて数を変える。タブが見えていない間は確かめない', async () => {
    show(1);
    await act(() => vi.advanceTimersByTimeAsync(29_000));
    expect(fetchCount).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(fetchCount).toHaveBeenCalledWith('/api/notifications/unread-count');
    // TanStack Query tells its subscribers on the next tick (setTimeout 0).
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(screen.getByRole('link')).toHaveAccessibleName('通知 未読 3 件');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    fetchCount.mockClear();
    await act(() => vi.advanceTimersByTimeAsync(90_000));
    expect(fetchCount).not.toHaveBeenCalled();
  });
});
