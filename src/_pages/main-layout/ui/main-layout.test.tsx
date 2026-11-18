// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainLayout } from './main-layout';

vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));
vi.mock('@/features/account-access/index.server', () => ({ signOutAction: async () => undefined }));

describe('MainLayout', () => {
  it('ページを 3 カラムのメインに出し、モーダルの枠も並べる', () => {
    render(
      <MainLayout
        viewer={{ name: 'サンプル', username: 'taro', image: null }}
        modal={<div role="dialog">モーダル</div>}
      >
        ページ
      </MainLayout>,
    );
    expect(screen.getByRole('button', { name: 'アカウントのメニュー' })).toHaveTextContent('@taro');
    expect(within(screen.getByRole('main')).getByText('ページ')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('モーダル');
    expect(within(screen.getByRole('complementary')).getByRole('contentinfo')).toBeInTheDocument();
  });
});
