// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loaded = vi.fn();

// Each test starts with nothing loaded: the module remembers the card once it is here.
beforeEach(() => {
  vi.resetModules();
  loaded.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 404 })),
  );
  vi.doMock('./user-hover-card-live', async (importOriginal) => {
    loaded();
    return importOriginal();
  });
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function card(username = 'hanako') {
  const { UserHoverCard } = await import('./user-hover-card');
  return (
    <UserHoverCard username={username} name="花子" label={`${username} のプロフィール`}>
      アバター
    </UserHoverCard>
  );
}

// NFR-PERF-05: 最初に送る JavaScript に、ホバーカードの部品を入れない
describe('UserHoverCard の読み込み（#32）', () => {
  it('かざすまでカードの部品を読み込まず、ただのプロフィールへのリンクを出す', async () => {
    render(await card());
    const link = screen.getByRole('link', { name: 'hanako のプロフィール' });
    expect(link).toHaveAttribute('href', '/hanako');
    await wait(50);
    expect(loaded).not.toHaveBeenCalled();
  });

  it('0.5 秒より早く離れたら、カードは出ない', async () => {
    render(await card());
    const link = screen.getByRole('link', { name: 'hanako のプロフィール' });
    await userEvent.hover(link);
    await wait(100);
    await userEvent.unhover(link);
    await wait(600);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('カードを一度読み込んだあとに出るリンクも、かざせばカードを出す', async () => {
    const first = render(await card());
    await userEvent.hover(screen.getByRole('link', { name: 'hanako のプロフィール' }));
    await screen.findByRole('dialog', {}, { timeout: 2000 });
    first.unmount();
    render(await card('taro'));
    await userEvent.hover(screen.getByRole('link', { name: 'taro のプロフィール' }));
    expect(await screen.findByRole('dialog', {}, { timeout: 2000 })).toHaveTextContent('@taro');
    expect(loaded).toHaveBeenCalledTimes(1);
  });

  it('0.5 秒たったあと、カードの部品が届く前に離れても、カードは出ない', async () => {
    // A slow network: the card's parts arrive 300ms after the pointer has rested.
    vi.doMock('./user-hover-card-live', async (importOriginal) => {
      loaded();
      await wait(800);
      return importOriginal();
    });
    render(await card());
    const link = screen.getByRole('link', { name: 'hanako のプロフィール' });
    await userEvent.hover(link);
    await wait(600);
    await userEvent.unhover(link);
    await wait(700);
    expect(loaded).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
