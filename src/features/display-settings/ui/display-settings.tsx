'use client';

import { useState } from 'react';
import { type Accent, ACCENTS, type Theme } from '@/shared/config';
import type { SetDisplayActionResult } from '../api/actions';

type Display = { theme: Theme; accent: Accent };

const THEME_LABELS: Record<Theme, string> = {
  light: 'デフォルト',
  dim: 'ダークブルー',
  dark: 'ブラック',
};
const ACCENT_LABELS: Record<Accent, string> = {
  blue: '青',
  yellow: '黄',
  pink: 'ピンク',
  purple: '紫',
  orange: 'オレンジ',
  green: '緑',
};

/** Puts the choice on <html> at once, as the head script does on the next load (ADR-0051). */
function apply({ theme, accent }: Display) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = accent;
}

/**
 * /settings/display (#29, ui-ux.md 4): the three backgrounds and six accent colours. A choice shows
 * at once and is saved; if saving fails, the previous look comes back.
 */
export function DisplaySettings({
  theme,
  accent,
  action,
}: Display & { action: (display: Display) => Promise<SetDisplayActionResult> }) {
  const [display, setDisplay] = useState<Display>({ theme, accent });
  const [failed, setFailed] = useState(false);
  const choose = async (next: Display) => {
    const before = display;
    setDisplay(next);
    setFailed(false);
    apply(next);
    const result = await action(next);
    if (result.ok) return;
    setDisplay(before);
    apply(before);
    setFailed(true);
  };
  return (
    <div className="flex flex-col gap-6 px-4 py-3">
      <fieldset>
        <legend className="mb-2 text-title font-extrabold">色</legend>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(ACCENTS) as Accent[]).map((value) => (
            <label key={value} className="flex flex-col items-center gap-1 text-[13px]">
              <input
                type="radio"
                name="accent"
                value={value}
                checked={display.accent === value}
                onChange={() => void choose({ ...display, accent: value })}
                className="size-10 cursor-pointer appearance-none rounded-full border-4 border-transparent checked:border-text"
                style={{ backgroundColor: ACCENTS[value] }}
              />
              {ACCENT_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-title font-extrabold">背景</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(THEME_LABELS) as Theme[]).map((value) => (
            <label
              key={value}
              data-theme={value}
              className="flex cursor-pointer items-center gap-2 rounded border border-line bg-[var(--bg)] px-4 py-3 font-bold text-[var(--text)]"
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={display.theme === value}
                onChange={() => void choose({ ...display, theme: value })}
              />
              {THEME_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>
      {failed ? (
        <p role="alert" className="text-danger">
          保存できませんでした。もう一度お試しください
        </p>
      ) : null}
    </div>
  );
}
