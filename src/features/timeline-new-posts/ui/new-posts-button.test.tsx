// @vitest-environment jsdom
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewPostsButton } from './new-posts-button';

const reply = (count: number) =>
  vi.fn(async () => new Response(JSON.stringify({ count }), { status: 200 }));

function setup(fetchMock: ReturnType<typeof reply>, since: string | null = '100') {
  vi.stubGlobal('fetch', fetchMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const reset = vi.spyOn(client, 'resetQueries');
  render(
    <QueryClientProvider client={client}>
      <NewPostsButton since={since} queryKey={['timeline', 'following']} />
    </QueryClientProvider>,
  );
  return { reset };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // jsdom reports the document as not visible ("prerender"): start from a tab in view.
  focusManager.setFocused(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  focusManager.setFocused(undefined);
});

describe('NewPostsButton（#28、ui-ux.md の 6 節、ADR-0011）', () => {
  it('先頭より新しい投稿の数を 30 秒ごとに確かめ（開いたときはまだ聞かない）、あれば「N 件のポストを表示」を出す', async () => {
    const fetchMock = reply(3);
    setup(fetchMock);
    await act(() => vi.advanceTimersByTimeAsync(0));
    // The list was just read: nothing is newer yet.
    expect(fetchMock).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetchMock).toHaveBeenCalledWith('/api/timeline/following/new-count?since=100');
    // The answer arrives after the timer that asked for it.
    expect(await screen.findByRole('button', { name: '3 件のポストを表示' })).toBeTruthy();
  });

  it('タブが見えていない間は確かめない', async () => {
    const fetchMock = reply(0);
    setup(fetchMock);
    act(() => focusManager.setFocused(false));
    await act(() => vi.advanceTimersByTimeAsync(90_000));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('押すと一覧を読み直して先頭へ戻る', async () => {
    const fetchMock = reply(2);
    const { reset } = setup(fetchMock);
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await userEvent.click(await screen.findByRole('button', { name: '2 件のポストを表示' }));
    expect(reset).toHaveBeenCalledWith({ queryKey: ['timeline', 'following'] });
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it('一覧が空（先頭が無い）なら確かめない', async () => {
    const fetchMock = reply(1);
    setup(fetchMock, null);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
