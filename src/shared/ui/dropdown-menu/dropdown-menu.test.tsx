// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loaded = vi.fn();

// Each test starts with nothing loaded: the module remembers the parts once they are here.
beforeEach(() => {
  vi.resetModules();
  loaded.mockClear();
  // Registered again for each test: a module mocked once stays cached across resetModules.
  vi.doMock('@/shared/ui/kit/dropdown-menu', async (importOriginal) => {
    loaded();
    return importOriginal();
  });
});

async function menu(onPick = vi.fn()) {
  const { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } =
    await import('./index');
  const view = (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="もっと見る" data-action="more" className="trigger">
        ⋯
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onPick}>削除</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return { view, onPick };
}

// NFR-PERF-05: 最初に送る JavaScript に、メニューの部品を入れない
describe('DropdownMenu（#32）', () => {
  it('押すまで部品を読み込まない。それまでのボタンも、名前と開くメニューを伝える', async () => {
    const { view } = await menu();
    render(view);
    const trigger = screen.getByRole('button', { name: 'もっと見る' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('data-action', 'more');
    expect(trigger).toHaveClass('trigger');
    expect(screen.queryByRole('menu')).toBeNull();
    // A load would have finished by now: a dynamic import resolves within a few ticks.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(loaded).not.toHaveBeenCalled();
  });

  it('押すと読み込んで開き、項目を選べる', async () => {
    const { view, onPick } = await menu();
    render(view);
    await userEvent.click(screen.getByRole('button', { name: 'もっと見る' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(loaded).toHaveBeenCalledTimes(1);
  });

  it('↓ キーでも開く。かざしたりフォーカスしたりすると、開かずに先に読み込む', async () => {
    const { view } = await menu();
    render(view);
    const trigger = screen.getByRole('button', { name: 'もっと見る' });
    fireEvent.pointerEnter(trigger);
    await waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(await screen.findByRole('menu')).toBeInTheDocument();
  });

  it('ほかのキーでは開かない。フォーカスでも先に読み込み、フォーカスはボタンに残る', async () => {
    const { view } = await menu();
    render(view);
    const trigger = screen.getByRole('button', { name: 'もっと見る' });
    fireEvent.keyDown(trigger, { key: 'a' });
    trigger.focus();
    await waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('menu')).toBeNull();
    // Loading on focus must not swap the button: a keyboard user would lose their place.
    expect(screen.getByRole('button', { name: 'もっと見る' })).toHaveFocus();
  });

  it('部品を読み込んだあとに出るメニューは、はじめから本物で、押せばすぐ開く', async () => {
    const first = await menu();
    const { unmount } = render(first.view);
    await userEvent.click(screen.getByRole('button', { name: 'もっと見る' }));
    await screen.findByRole('menu');
    unmount();
    const { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } =
      await import('./index');
    render(
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="二つ目">⋯</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>項目</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole('button', { name: '二つ目' });
    expect(trigger).toHaveAttribute('data-slot', 'dropdown-menu-trigger');
    await userEvent.click(trigger);
    expect(await screen.findByRole('menuitem', { name: '項目' })).toBeInTheDocument();
  });

  it('ボタンから開いたメニューを Esc で閉じると、フォーカスは本物のメニューのボタンに戻る', async () => {
    const { view } = await menu();
    // As the t shortcut does (#31): the post holds the focus, and the button is pressed by script.
    render(
      <div tabIndex={-1} aria-label="投稿">
        {view}
      </div>,
    );
    screen.getByLabelText('投稿').focus();
    act(() => screen.getByRole('button', { name: 'もっと見る' }).click());
    await screen.findByRole('menu');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(screen.getByRole('button', { name: 'もっと見る' })).toHaveFocus());
  });

  it('部品が来る前のボタンも、呼び出し側のイベント（押す・キー・フォーカス・かざす）を呼ぶ（4 回目のレビュー）', async () => {
    const { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } =
      await import('./index');
    const handlers = {
      onClick: vi.fn(),
      onKeyDown: vi.fn(),
      onFocus: vi.fn(),
      onPointerEnter: vi.fn(),
    };
    render(
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="もっと見る" {...handlers}>
          ⋯
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>項目</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole('button', { name: 'もっと見る' });
    fireEvent.pointerEnter(trigger);
    fireEvent.focus(trigger);
    fireEvent.keyDown(trigger, { key: 'a' });
    fireEvent.click(trigger);
    expect(handlers.onPointerEnter).toHaveBeenCalledTimes(1);
    expect(handlers.onFocus).toHaveBeenCalledTimes(1);
    expect(handlers.onKeyDown).toHaveBeenCalledTimes(1);
    // Once, by the real button the press swapped in: not by the stand-in as well.
    await screen.findByRole('menu');
    expect(handlers.onClick).toHaveBeenCalledTimes(1);
  });
});
