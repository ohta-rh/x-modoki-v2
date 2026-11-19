// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ErrorPage, GlobalErrorPage } from './error-page';

describe('ErrorPage（#71）', () => {
  it('日本語の見出しと説明を出し、「もう一度読み込む」で読み込み直す', async () => {
    const reload = vi.fn();
    render(<ErrorPage reload={reload} />);
    expect(screen.getByRole('heading', { name: '問題が起きました' })).toBeInTheDocument();
    expect(screen.getByText('読み込み直すと、続きから使えます。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'もう一度読み込む' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('読み込み直す手段を渡さなければ、ページを読み込み直す', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    render(<ErrorPage />);
    await userEvent.click(screen.getByRole('button', { name: 'もう一度読み込む' }));
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe('GlobalErrorPage（#71）', () => {
  it('根のレイアウトの誤りでも、<html lang="ja"> の日本語の画面を出す', () => {
    const html = renderToStaticMarkup(<GlobalErrorPage />);
    // React adds an empty <head> of its own.
    expect(html).toMatch(/^<html lang="ja">.*<body>.*<\/body><\/html>$/);
    expect(html).toContain('問題が起きました');
    expect(html).toContain('もう一度読み込む');
  });
});
