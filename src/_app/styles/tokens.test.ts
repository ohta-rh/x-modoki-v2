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
    '--text-muted': '#7b8086',
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

  it('フォーカスの輪は :focus-visible のときだけ、2px の、背景と差のあるアクセント色（#31）', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent-text\)/);
    expect(css).toMatch(/:focus:not\(:focus-visible\)\s*\{[^}]*outline:\s*none/);
  });
});

/** The value of `name` on <html data-theme={theme} data-accent={accent}>: later and more specific rules win. */
function resolve(name: string, theme: string, accent: string): string {
  const matches = (head: string) =>
    head
      .split(',')
      .some(
        (one) =>
          [...one.matchAll(/\[data-(theme|accent)=['"]?(\w+)['"]?\]/g)].every(([, key, value]) =>
            key === 'theme' ? value === theme : value === accent,
          ) && /^\s*(:root|(\[data-(theme|accent)=['"]?\w+['"]?\])+)\s*$/.test(one),
      );
  const rules = [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)]
    .map(([, head, body], order) => ({ head: head.trim(), body, order }))
    .filter(({ head }) => matches(head))
    .sort(
      (a, b) =>
        (a.head.match(/\[/g)?.length ?? 0) - (b.head.match(/\[/g)?.length ?? 0) ||
        a.order - b.order,
    );
  let value = '';
  for (const { body } of rules) {
    const found = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(body);
    if (found) value = found[1].trim().toLowerCase();
  }
  return value;
}

/** `rgb(r g b / a)` laid over the #rrggbb `bg`, as #rrggbb. */
function over(rgba: string, bg: string): string {
  const [r, g, b, a] = rgba.match(/[\d.]+/g)!.map(Number);
  return `#${[r, g, b]
    .map((c, i) => Math.round(c * a + parseInt(bg.slice(1 + i * 2, 3 + i * 2), 16) * (1 - a)))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** WCAG 2.2 contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b2);
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// NFR-A11Y-02: 色の差 4.5:1 以上
describe('色の差（WCAG 2.2 AA、#31、ADR-0054）', () => {
  const pairs = ['light', 'dim', 'dark'].flatMap((theme) =>
    ['blue', 'yellow', 'pink', 'purple', 'orange', 'green'].map((accent) => [theme, accent]),
  );

  it.each(pairs)(
    '%s・%s: 文字に使う色は、どれも背景とも、ホバーした行の背景とも 4.5:1 以上',
    (theme, accent) => {
      const bg = resolve('--bg', theme, accent);
      const hovered = over(resolve('--hover', theme, accent), bg);
      for (const name of [
        '--text',
        '--text-muted',
        '--accent-text',
        '--like-text',
        '--repost-text',
        '--danger-text',
      ]) {
        expect(contrast(resolve(name, theme, accent), bg), name).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(resolve(name, theme, accent), hovered),
          `${name} on hover`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it.each(pairs)('%s・%s: 塗りの上の文字は、塗りと 4.5:1 以上', (theme, accent) => {
    expect(
      contrast(resolve('--on-accent', theme, accent), resolve('--accent-fill', theme, accent)),
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', resolve('--danger-fill', theme, accent))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
