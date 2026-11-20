// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loaded = vi.fn();

// Each test starts with nothing loaded: the module remembers the parts once they are here.
beforeEach(() => {
  vi.resetModules();
  loaded.mockClear();
  vi.doMock('@/shared/ui/kit/dialog', async (importOriginal) => {
    loaded();
    return importOriginal();
  });
});

async function dialog(open: boolean, onOpenChange = vi.fn()) {
  const { Dialog, DialogContent, DialogDescription, DialogTitle } = await import('./index');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="box">
        <DialogTitle>ポストを削除しますか？</DialogTitle>
        <DialogDescription>取り消せません。</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

// NFR-PERF-05: 最初に送る JavaScript に、ダイアログの部品を入れない
describe('Dialog（#32）', () => {
  it('閉じているあいだは何も出さず、部品も読み込まない', async () => {
    render(await dialog(false));
    // A load would have finished by now: a dynamic import resolves within a few ticks.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(loaded).not.toHaveBeenCalled();
  });

  it('開くと部品を読み込んで、タイトルと説明のあるダイアログを出す', async () => {
    const { rerender } = render(await dialog(false));
    rerender(await dialog(true));
    const shown = await screen.findByRole('dialog', { name: 'ポストを削除しますか？' });
    expect(shown).toHaveAccessibleDescription('取り消せません。');
    expect(shown).toHaveClass('box');
    expect(loaded).toHaveBeenCalledTimes(1);
  });

  it('部品を読み込んだあとのダイアログは、開いたその場で出る', async () => {
    const { unmount } = render(await dialog(true));
    await screen.findByRole('dialog');
    unmount();
    render(await dialog(true));
    expect(screen.getByRole('dialog', { name: 'ポストを削除しますか？' })).toBeInTheDocument();
  });

  it('画面より高い中身でも、上下が切れず中を送れる（#75）', async () => {
    render(await dialog(true));
    expect(await screen.findByRole('dialog')).toHaveClass(
      'max-h-[calc(100dvh-2rem)]',
      'overflow-y-auto',
    );
  });
});
