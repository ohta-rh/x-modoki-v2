// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainLayout } from './main-layout';

vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));
vi.mock('@/features/account-access/index.server', () => ({ signOutAction: async () => undefined }));

describe('MainLayout', () => {
  it('入っていない人には、アカウントのメニューを出さない', () => {
    render(
      <MainLayout viewer={null} modal={null}>
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
          viewer={{ name: 'サンプル', username: 'taro', image: null, unread: 3 }}
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
});
