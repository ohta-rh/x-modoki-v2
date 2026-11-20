// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LeftNav } from './left-nav';

const nav = () => screen.getByRole('navigation', { name: 'メインのメニュー' });
const link = (name: string) => within(nav()).getByRole('link', { name });

describe('LeftNav（ui-ux.md の 3 節）', () => {
  // FR-SHELL-08: 今いる画面の表示
  it('今いる画面の項目は aria-current で、太字と塗りつぶしのアイコンになる', () => {
    render(<LeftNav currentPath="/home" />);
    expect(link('ホーム')).toHaveAttribute('aria-current', 'page');
    expect(link('ホーム')).toHaveClass('font-bold');
    expect(link('ホーム').querySelector('svg')).toHaveAttribute('data-active', 'true');
    expect(link('通知')).not.toHaveAttribute('aria-current');
    expect(link('通知')).not.toHaveClass('font-bold');
    expect(link('通知').querySelector('svg')).toHaveAttribute('data-active', 'false');
  });

  it('アイコンは 24px（ui-ux.md の 3 節）', () => {
    render(<LeftNav currentPath="/home" />);
    for (const icon of nav().querySelectorAll('a svg:not([viewBox="0 0 64 64"]), button svg')) {
      expect(icon).toHaveClass('size-6');
    }
  });

  it('下の階層の画面でも、その項目を今いる画面にする', () => {
    render(<LeftNav currentPath="/notifications/mentions" />);
    expect(link('通知')).toHaveAttribute('aria-current', 'page');
  });

  it('項目が仕様の順で並び、メッセージが無い', () => {
    render(<LeftNav currentPath="/home" />);
    const names = within(nav())
      .getAllByRole('link')
      .map((element) => element.getAttribute('aria-label') ?? element.textContent);
    expect(names).toEqual([
      'x-modoki のホーム',
      'ホーム',
      '話題を検索',
      '通知',
      'ブックマーク',
      'プロフィール',
      'ポストする',
    ]);
    expect(within(nav()).getByRole('button', { name: 'もっと見る' })).toBeInTheDocument();
    expect(within(nav()).queryByText('メッセージ')).toBeNull();
  });

  it('ロゴは x-modoki のホームへのリンク、投稿ボタンは投稿の画面へのリンク', () => {
    render(<LeftNav currentPath="/home" />);
    expect(link('x-modoki のホーム')).toHaveAttribute('href', '/home');
    expect(link('ポストする')).toHaveAttribute('href', '/compose/post');
  });

  // NFR-A11Y-06: 名前は見えている文字を含む（WCAG 2.5.3）
  it('投稿のボタンの名前は、見えている文字「ポストする」と同じ（#31）', () => {
    render(<LeftNav currentPath="/home" />);
    const post = link('ポストする');
    expect(post).toHaveAccessibleName(post.textContent!);
  });

  it('ログインしていれば、下にアカウントのメニューを出し、していなければ出さない', () => {
    const { unmount } = render(<LeftNav currentPath="/home" />);
    expect(screen.queryByRole('button', { name: /アカウントのメニュー/ })).toBeNull();
    unmount();
    render(
      <LeftNav
        currentPath="/home"
        account={{ name: 'サンプル', username: 'taro', image: null }}
        signOut={async () => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /アカウントのメニュー/ })).toHaveTextContent('@taro');
  });

  it('ログインしていれば、プロフィールはその人の URL', () => {
    render(<LeftNav currentPath="/taro" username="taro" />);
    expect(link('プロフィール')).toHaveAttribute('href', '/taro');
    expect(link('プロフィール')).toHaveAttribute('aria-current', 'page');
  });
});
