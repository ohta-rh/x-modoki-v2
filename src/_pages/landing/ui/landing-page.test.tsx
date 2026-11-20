// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  it('アプリの名前「x-modoki」を見出しに出す', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('x-modoki');
  });

  it('FR-SHELL-09: X Corp. とは関係の無い学習用のアプリだと書く', () => {
    render(<LandingPage />);
    expect(screen.getByText('X Corp. とは関係の無い学習用のアプリ')).toBeTruthy();
  });

  it('ログインしていない人の入口: 登録とログインへのリンクと、自前のロゴを出す', () => {
    render(<LandingPage />);
    expect(screen.getByRole('link', { name: 'アカウントを作成' })).toHaveAttribute(
      'href',
      '/i/flow/signup',
    );
    expect(screen.getByRole('link', { name: 'ログイン' })).toHaveAttribute('href', '/i/flow/login');
    expect(document.querySelector('svg[viewBox="0 0 64 64"]')).not.toBeNull();
  });
});
