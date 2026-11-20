// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsLayout } from './settings-layout';

let pathname = '/settings';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('SettingsLayout（#29）', () => {
  it('左に「設定」の一覧（アカウント・表示・プロフィールを編集）、右に中身。選んでいる項目に印', () => {
    pathname = '/settings/display';
    render(<SettingsLayout>中身</SettingsLayout>);
    const list = screen.getByRole('navigation', { name: '設定' });
    expect(screen.getByRole('link', { name: 'アカウント' })).toHaveAttribute(
      'href',
      '/settings/account',
    );
    expect(screen.getByRole('link', { name: '表示' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'プロフィールを編集' })).toHaveAttribute(
      'href',
      '/settings/profile',
    );
    expect(screen.getByText('中身')).toBeInTheDocument();
    // 640px 未満では、項目を開いているときは一覧を隠す。
    expect(list.parentElement).toHaveClass('hidden', 'sm:block');
  });

  it('/settings では、640px 未満は一覧だけを出し、中身の欄を隠す', () => {
    pathname = '/settings';
    render(<SettingsLayout>選んでください</SettingsLayout>);
    expect(screen.getByRole('navigation', { name: '設定' }).parentElement).not.toHaveClass(
      'hidden',
    );
    expect(screen.getByText('選んでください')).toHaveClass('hidden', 'sm:block');
  });
});
