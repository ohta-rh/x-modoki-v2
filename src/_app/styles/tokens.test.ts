import { describe, expect, it } from 'vitest';
import raw from './global.css?raw';

const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

// docs/architecture/ui-ux.md 4: the token table, written here from the document.
const THEMES = {
  light: {
    '--bg': '#ffffff',
    '--border': '#eff3f4',
    '--text': '#0f1419',
    '--text-muted': '#536471',
    '--hover': 'rgb(15 20 25 / 0.1)',
  },
  dim: {
    '--bg': '#15202b',
    '--border': '#38444d',
    '--text': '#f7f9f9',
    '--text-muted': '#8b98a5',
    '--hover': 'rgb(255 255 255 / 0.03)',
  },
  dark: {
    '--bg': '#000000',
    '--border': '#2f3336',
    '--text': '#e7e9ea',
    '--text-muted': '#71767b',
    '--hover': 'rgb(231 233 234 / 0.1)',
  },
};
const SHARED = {
  '--accent': '#1d9bf0',
  '--like': '#f91880',
  '--repost': '#00ba7c',
  '--danger': '#f4212e',
  '--radius-card': '16px',
  '--header-height': '53px',
  '--nav-width': '275px',
  '--nav-width-compact': '88px',
  '--main-width': '600px',
  '--sidebar-width': '350px',
};

/** The custom properties declared directly in the first rule whose selector matches. */
function declarations(selector: RegExp): Record<string, string> {
  const rule = [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)].find(([, head]) => selector.test(head));
  if (!rule) return {};
  return Object.fromEntries(
    [...rule[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim().toLowerCase(),
    ]),
  );
}

describe('デザイントークン（ui-ux.md の 4 節）', () => {
  it.each(Object.entries(THEMES))('%s のテーマの色', (theme, expected) => {
    const selector = new RegExp(`\\[data-theme=['"]?${theme}['"]?\\]`);
    expect(declarations(selector)).toMatchObject(expected);
  });

  it('テーマに関わらない色・角・幅', () => {
    expect(declarations(/^\s*:root\s*$/)).toMatchObject(SHARED);
  });

  it('文字の大きさ（本文 15px / 20px、詳細の本文 17px、見出し 20px）', () => {
    expect(declarations(/^\s*@theme inline\s*$/)).toMatchObject({
      '--text-body': '15px',
      '--text-body--line-height': '20px',
      '--text-body-lg': '17px',
      '--text-title': '20px',
    });
  });

  it('フォントは自前の並びで、X のフォントを使わない', () => {
    expect(css).toContain(
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans JP'",
    );
    expect(css.toLowerCase()).not.toContain('chirp');
  });

  it('フォーカスの輪は :focus-visible のときだけ、2px のアクセント色', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/);
    expect(css).toMatch(/:focus:not\(:focus-visible\)\s*\{[^}]*outline:\s*none/);
  });
});
