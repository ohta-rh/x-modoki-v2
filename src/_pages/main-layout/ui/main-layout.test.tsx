// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainLayout } from './main-layout';

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/features/account-access/index.server', () => ({ signOutAction: async () => undefined }));
vi.mock('@/features/user-follow/index.server', () => ({
  setFollowAction: async () => ({ ok: true }),
}));
vi.mock('next/form', () => ({
  default: ({ action, children }: { action: string; children: React.ReactNode }) => (
    <form action={action}>{children}</form>
  ),
}));

const sidebar = {
  trends: [{ tag: '猫', count: 2 }],
  suggestions: [
    { username: 'hana', name: '花子', avatarUrl: null, bio: '', isFollowing: false, isSelf: false },
  ],
};

describe('MainLayout', () => {
  it('入っていない人には、アカウントのメニューを出さない', () => {
    render(
      <MainLayout viewer={null} modal={null} sidebar={sidebar}>
        ページ
      </MainLayout>,
    );
    expect(screen.queryByRole('button', { name: 'アカウントのメニュー' })).toBeNull();
    expect(within(screen.getByRole('main')).getByText('ページ')).toBeInTheDocument();
  });

  it('ページを 3 カラムのメインに出し、モーダルの枠も並べる', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MainLayout
          viewer={{
            name: 'サンプル',
            username: 'taro',
            image: null,
            unread: 3,
            theme: 'light',
            accent: 'blue',
          }}
          sidebar={sidebar}
          modal={<div role="dialog">モーダル</div>}
        >
          ページ
        </MainLayout>
      </QueryClientProvider>,
    );
    // The viewer's unread notifications reach the shell (#26).
    expect(
      within(screen.getByRole('navigation', { name: 'メインのメニュー' })).getByRole('link', {
        name: /^通知/,
      }),
    ).toHaveAccessibleName('通知 未読 3 件');
    expect(screen.getByRole('button', { name: 'アカウントのメニュー' })).toHaveTextContent('@taro');
    expect(within(screen.getByRole('main')).getByText('ページ')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('モーダル');
    expect(within(screen.getByRole('complementary')).getByRole('contentinfo')).toBeInTheDocument();
  });

  it('右サイドバーに、検索の欄・トレンド・おすすめユーザーを出す。入っていなければフォローはログインへ（#27）', () => {
    render(
      <MainLayout viewer={null} modal={null} sidebar={sidebar}>
        ページ
      </MainLayout>,
    );
    const aside = within(screen.getByRole('complementary'));
    expect(aside.getByRole('searchbox', { name: '検索' })).toBeInTheDocument();
    expect(aside.getByRole('region', { name: 'いまどうしてる？' })).toHaveTextContent('#猫');
    expect(
      within(aside.getByRole('region', { name: 'おすすめユーザー' })).getByRole('link', {
        name: 'フォロー',
      }),
    ).toHaveAttribute('href', expect.stringContaining('/i/flow/login'));
  });

  it('入っている人には、キーボードの操作がある（? で一覧）。入っていない人には無い（#29）', async () => {
    const layout = (viewer: Parameters<typeof MainLayout>[0]['viewer']) => (
      <QueryClientProvider client={new QueryClient()}>
        <MainLayout viewer={viewer} sidebar={sidebar} modal={null}>
          ページ
        </MainLayout>
      </QueryClientProvider>
    );
    const { unmount } = render(layout(null));
    fireEvent.keyDown(document.body, { key: '?' });
    expect(screen.queryByRole('dialog', { name: 'キーボードショートカット' })).toBeNull();
    unmount();
    render(
      layout({
        name: 'サンプル',
        username: 'taro',
        image: null,
        unread: 0,
        theme: 'light',
        accent: 'blue',
      }),
    );
    fireEvent.keyDown(document.body, { key: '?' });
    expect(await screen.findByRole('dialog', { name: 'キーボードショートカット' })).toBeTruthy();
  });
});
