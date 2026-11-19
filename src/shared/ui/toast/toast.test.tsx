// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loaded = vi.fn();

// Each test gets a fresh queue: the module keeps the toasts added before the toaster loads.
beforeEach(() => {
  vi.resetModules();
  loaded.mockClear();
  // Registered again for each test: a module mocked once stays cached across resetModules.
  vi.doMock('@/shared/ui/kit/toast', async (importOriginal) => {
    loaded();
    return importOriginal();
  });
});

// NFR-PERF-05: 最初に送る JavaScript に、トーストの部品を入れない
describe('toast と Toaster（#32）', () => {
  it('知らせが無くても、手が空いたら部品を読み込み、「お知らせ」の置き場を先に出しておく', async () => {
    // A live region must be in the page before its first message, or readers may miss it (#64).
    let idle: (() => void) | undefined;
    vi.stubGlobal('requestIdleCallback', (run: () => void) => {
      idle = run;
      return 1;
    });
    try {
      const { Toaster } = await import('./index');
      render(<Toaster />);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(loaded).not.toHaveBeenCalled();
      act(() => idle!());
      expect(await screen.findByRole('region', { name: 'お知らせ' })).toBeInTheDocument();
      expect(loaded).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('手が空くのを待てない環境でも、描いたあとに置き場を出す', async () => {
    const { Toaster } = await import('./index');
    render(<Toaster />);
    expect(await screen.findByRole('region', { name: 'お知らせ' })).toBeInTheDocument();
  });

  it('知らせを出し、そのあとの知らせも出す', async () => {
    const { toast, Toaster } = await import('./index');
    render(<Toaster />);
    act(() => toast.add({ title: '保存できませんでした' }));
    expect(await screen.findByText('保存できませんでした')).toBeInTheDocument();
    expect(loaded).toHaveBeenCalledTimes(1);
    act(() =>
      toast.add({ title: 'もう一度', description: <a href="https://example.com/x">見る</a> }),
    );
    expect(await screen.findByText('もう一度')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '見る' })).toHaveAttribute(
      'href',
      'https://example.com/x',
    );
  });

  it('Toaster が出る前に来た知らせも、出たあとに出す', async () => {
    const { toast, Toaster } = await import('./index');
    toast.add({ title: '先に来た知らせ' });
    render(<Toaster />);
    expect(await screen.findByText('先に来た知らせ')).toBeInTheDocument();
  });

  it('サーバーで描くときは何も出さず、部品も読み込まない', async () => {
    const { renderToString } = await import('react-dom/server');
    const { toast, Toaster } = await import('./index');
    toast.add({ title: 'サーバーには出ない' });
    expect(renderToString(<Toaster />)).toBe('');
    expect(loaded).not.toHaveBeenCalled();
  });
});
