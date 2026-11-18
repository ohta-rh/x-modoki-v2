// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
import { PageHeader } from './page-header';
import { TabBar } from './tab-bar';

vi.mock('next/navigation', () => ({ usePathname: () => '/explore' }));

describe('AppShell（ui-ux.md の 2 節）', () => {
  it('左の列・メイン・右サイドバー・下のタブバー・右下の投稿ボタンを並べ、中身をメインに出す', () => {
    render(
      <AppShell>
        <p>中身</p>
      </AppShell>,
    );
    expect(screen.getByTestId('left-column')).toHaveClass(
      'hidden',
      'sm:flex',
      'w-[88px]',
      'xl:w-[275px]',
    );
    expect(within(screen.getByRole('main')).getByText('中身')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toHaveClass('hidden', 'lg:block', 'w-[350px]');
    expect(screen.getByRole('navigation', { name: '下のタブ' }).parentElement).toHaveClass(
      'sm:hidden',
    );
    const compose = screen.getAllByRole('link', { name: '投稿する' }).at(-1);
    expect(compose?.closest('div')).toHaveClass('fixed', 'sm:hidden');
  });

  it('今いるパスを左ナビと下のタブに渡す', () => {
    render(<AppShell>中身</AppShell>);
    const nav = screen.getByRole('navigation', { name: 'メインのメニュー' });
    expect(within(nav).getByRole('link', { name: '話題を検索' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const tabs = screen.getByRole('navigation', { name: '下のタブ' });
    expect(within(tabs).getByRole('link', { name: '検索' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('右サイドバーの中身を右の列に出し、右サイドバーが出ない幅のためにメインの下にもフッターを出す', () => {
    render(<AppShell sidebar={<p>右の中身</p>}>中身</AppShell>);
    expect(within(screen.getByRole('complementary')).getByText('右の中身')).toBeInTheDocument();
    const footer = within(screen.getByRole('main')).getByRole('contentinfo');
    expect(footer).toHaveTextContent('X Corp. とは関係の無い学習用のアプリ');
    expect(footer).toHaveClass('lg:hidden');
  });
});

describe('TabBar', () => {
  it('ホーム・検索・通知を出し、今いるタブを塗りつぶす', () => {
    render(<TabBar currentPath="/home" />);
    const tabs = screen.getByRole('navigation', { name: '下のタブ' });
    expect(
      within(tabs)
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label')),
    ).toEqual(['ホーム', '検索', '通知']);
    expect(within(tabs).getByRole('link', { name: 'ホーム' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(tabs).getByRole('link', { name: '通知' }).querySelector('svg')).toHaveAttribute(
      'data-active',
      'false',
    );
  });
});

describe('PageHeader', () => {
  it('見出しを出し、上に貼りつく半透明の 53px のヘッダーになる', () => {
    render(<PageHeader title="ホーム" />);
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('heading', { level: 1, name: 'ホーム' })).toHaveClass(
      'text-xl',
      'font-extrabold',
    );
    expect(header).toHaveClass('sticky', 'top-0', 'h-[53px]', 'backdrop-blur-[12px]');
  });
});
