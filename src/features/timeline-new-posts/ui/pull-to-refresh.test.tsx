// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PullToRefresh } from './pull-to-refresh';

const narrow = (matches: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query }));
const pull = (from: number, to: number) => {
  const list = screen.getByText('一覧');
  fireEvent.touchStart(list, { touches: [{ clientY: from }] });
  fireEvent.touchMove(list, { touches: [{ clientY: to }] });
  fireEvent.touchEnd(list, { touches: [], changedTouches: [{ clientY: to }] });
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.scrollY = 0;
});

describe('PullToRefresh（#28、ui-ux.md の 6 節）', () => {
  it('640px 未満で、いちばん上から 80px 以上引っ張って離すと読み直す', () => {
    narrow(true);
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh}>一覧</PullToRefresh>);
    pull(100, 150);
    expect(onRefresh).not.toHaveBeenCalled();
    pull(100, 200);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('引っ張っている間は、読み直す印を見せる', () => {
    narrow(true);
    render(<PullToRefresh onRefresh={vi.fn()}>一覧</PullToRefresh>);
    const list = screen.getByText('一覧');
    fireEvent.touchStart(list, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(list, { touches: [{ clientY: 160 }] });
    expect(screen.getByTestId('pull-indicator').style.height).toBe('60px');
    fireEvent.touchEnd(list, { touches: [] });
    expect(screen.queryByTestId('pull-indicator')).toBeNull();
  });

  it('640px 以上、またはいちばん上でないときは何もしない。上へ動かしても何もしない', () => {
    const onRefresh = vi.fn();
    narrow(false);
    render(<PullToRefresh onRefresh={onRefresh}>一覧</PullToRefresh>);
    pull(100, 300);
    narrow(true);
    window.scrollY = 50;
    pull(100, 300);
    window.scrollY = 0;
    pull(300, 100);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.queryByTestId('pull-indicator')).toBeNull();
  });

  it('途中で取り消されたら（OS がタッチを取った）、印を消して読み直さない（レビュー 1）', () => {
    narrow(true);
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh}>一覧</PullToRefresh>);
    const list = screen.getByText('一覧');
    fireEvent.touchStart(list, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(list, { touches: [{ clientY: 250 }] });
    fireEvent.touchCancel(list, { touches: [] });
    expect(screen.queryByTestId('pull-indicator')).toBeNull();
    fireEvent.touchEnd(list, { touches: [] });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
