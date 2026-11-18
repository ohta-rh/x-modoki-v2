// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DisplaySync } from './display-sync';

const html = document.documentElement;
afterEach(() => {
  for (const name of ['theme', 'accent']) document.cookie = `${name}=; max-age=0; path=/`;
  html.removeAttribute('data-theme');
  html.removeAttribute('data-accent');
});

describe('DisplaySync（#29 レビュー 1）', () => {
  it('アカウントに保存した見た目が html と違えば（別のブラウザ・cookie を消したあと）、合わせて cookie も書く', () => {
    html.dataset.theme = 'light';
    render(<DisplaySync theme="dim" accent="pink" />);
    expect(html.dataset.theme).toBe('dim');
    expect(html.dataset.accent).toBe('pink');
    expect(document.cookie).toContain('theme=dim');
    expect(document.cookie).toContain('accent=pink');
  });

  it('同じなら何もしない', () => {
    html.dataset.theme = 'dark';
    html.dataset.accent = 'green';
    render(<DisplaySync theme="dark" accent="green" />);
    expect(document.cookie).not.toContain('theme=');
  });
});
