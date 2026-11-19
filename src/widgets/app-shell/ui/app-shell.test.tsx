// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
import { PageHeader } from './page-header';
import { TabBar } from './tab-bar';

const at = vi.hoisted(() => ({ path: '/explore' }));
vi.mock('next/navigation', () => ({ usePathname: () => at.path }));

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
    const compose = screen.getAllByRole('link', { name: 'ポストする' }).at(-1);
    expect(compose?.closest('div')).toHaveClass('fixed', 'sm:hidden');
  });

  it('左の列は、画面より高いと中を送れる（低い画面でもアカウントのメニューに届く、#83）', () => {
    render(<AppShell>中身</AppShell>);
    expect(screen.getByTestId('left-column')).toHaveClass('sticky', 'h-screen', 'overflow-y-auto');
  });

  it('ログインしていれば、640px 未満のヘッダーの左に、アカウントの引き出しのボタンを出す（#85）', () => {
    const { unmount } = render(<AppShell>中身</AppShell>);
    expect(document.querySelector('[data-mobile-account]')).toBeNull();
    unmount();
    render(
      <AppShell
        account={{ name: 'サンプル', username: 'taro', image: null }}
        signOut={async () => undefined}
      >
        中身
      </AppShell>,
    );
    expect(document.querySelector('[data-mobile-account]')).toHaveClass('sm:hidden');
  });

  it('今いるパスと今の人を、左ナビと下のタブに渡す', () => {
    render(
      <AppShell
        account={{ name: 'サンプル', username: 'taro', image: null }}
        signOut={async () => undefined}
      >
        中身
      </AppShell>,
    );
    // The left column's menu (the drawer's button is the same name, shown only below 640px).
    expect(
      within(screen.getByTestId('left-column')).getByRole('button', {
        name: /アカウントのメニュー/,
      }),
    ).toHaveTextContent('@taro');
    expect(screen.getByRole('link', { name: 'プロフィール' })).toHaveAttribute('href', '/taro');
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

describe('右下の投稿ボタンと、メインの下の余白（#65）', () => {
  const floating = () =>
    screen.queryAllByRole('link', { name: 'ポストする' }).filter((link) => link.closest('.fixed'));

  it('投稿の画面と設定の画面では、右下の投稿ボタンを出さない（その画面の操作に重なるので）', () => {
    for (const path of ['/compose/post', '/settings', '/settings/profile', '/settings/display']) {
      at.path = path;
      const { unmount } = render(<AppShell>中身</AppShell>);
      expect(floating(), path).toHaveLength(0);
      unmount();
    }
    // A user may be named settings_fan: their profile keeps the button (review 1 of #65).
    for (const path of ['/home', '/settings_fan', '/settings_fan/status/1']) {
      at.path = path;
      const { unmount } = render(<AppShell>中身</AppShell>);
      expect(floating(), path).toHaveLength(1);
      unmount();
    }
    at.path = '/explore';
  });

  it('640px 未満のメインの下には、タブバーと投稿ボタンの分の余白を取る', () => {
    render(<AppShell>中身</AppShell>);
    expect(screen.getByRole('main')).toHaveClass('pb-[136px]', 'sm:pb-0');
  });
});

describe('通知の未読の数（#26）', () => {
  const notifications = (nav: string) =>
    within(screen.getByRole('navigation', { name: nav })).getByRole('link', { name: /^通知/ });

  it('ログインしていれば、左のナビと下のタブの「通知」に未読の数が付く', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AppShell account={{ name: '花子', username: 'hanako', image: null }} unread={2}>
          <p>中身</p>
        </AppShell>
      </QueryClientProvider>,
    );
    expect(notifications('メインのメニュー')).toHaveAccessibleName('通知 未読 2 件');
    expect(notifications('下のタブ')).toHaveAccessibleName('通知 未読 2 件');
  });

  it('未読の数が渡されなければ（ログインしていない）、「通知」だけ', () => {
    render(
      <AppShell>
        <p>中身</p>
      </AppShell>,
    );
    expect(notifications('メインのメニュー')).toHaveAccessibleName('通知');
    expect(notifications('下のタブ')).toHaveAccessibleName('通知');
  });
});

describe('TabBar', () => {
  it('ホーム・検索・通知を出し、今いるタブを塗りつぶす', () => {
    render(<TabBar currentPath="/home" />);
    const tabs = screen.getByRole('navigation', { name: '下のタブ' });
    expect(
      within(tabs)
        .getAllByRole('link')
        .map((link) => link.textContent),
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
      'text-title',
      'font-extrabold',
    );
    expect(header).toHaveClass('sticky', 'top-0', 'h-[53px]', 'backdrop-blur-[12px]');
  });
});
