// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { ACCENTS, DISPLAY_SCRIPT, THEMES, displayCookies } from './display';

const run = () => new Function(DISPLAY_SCRIPT)();
const html = document.documentElement;

afterEach(() => {
  for (const name of ['theme', 'accent']) document.cookie = `${name}=; max-age=0; path=/`;
  html.removeAttribute('data-theme');
  html.removeAttribute('data-accent');
});

describe('表示の設定（#29、ui-ux.md の 4 節、ADR-0051）', () => {
  it('3 つのテーマと 6 つのアクセントの色', () => {
    expect(THEMES).toEqual(['light', 'dim', 'dark']);
    expect(Object.keys(ACCENTS)).toEqual(['blue', 'yellow', 'pink', 'purple', 'orange', 'green']);
    expect(ACCENTS.blue).toBe('#1d9bf0');
  });

  it('head のスクリプトは、cookie のテーマと色を html に付ける', () => {
    document.cookie = 'theme=dim; path=/';
    document.cookie = 'accent=pink; path=/';
    run();
    expect(html.dataset.theme).toBe('dim');
    expect(html.dataset.accent).toBe('pink');
  });

  it('知らない値や cookie の無いときは、何も付けない（既定のまま）', () => {
    html.dataset.theme = 'light';
    document.cookie = 'theme=<script>; path=/';
    document.cookie = 'accent=red; path=/';
    run();
    expect(html.dataset.theme).toBe('light');
    expect(html.hasAttribute('data-accent')).toBe(false);
  });

  it('保存する cookie の値は、1 年持つ', () => {
    expect(displayCookies({ theme: 'dark', accent: 'green' })).toEqual([
      { name: 'theme', value: 'dark', maxAge: 31_536_000, path: '/', sameSite: 'lax' },
      { name: 'accent', value: 'green', maxAge: 31_536_000, path: '/', sameSite: 'lax' },
    ]);
  });
});
