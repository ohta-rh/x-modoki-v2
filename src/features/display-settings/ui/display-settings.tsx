'use client';

import { useEffect, useRef, useState } from 'react';
import { type Accent, ACCENTS, type Theme } from '@/shared/config';
import { applyDisplay as apply, type Display } from '../lib/apply-display';
import type { SetDisplayActionResult } from '../api/actions';

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
  // The latest choice: an earlier save that fails no longer has a say (review 2).
  const latest = useRef(0);
  const choose = async (next: Display) => {
    const before = display;
    const mine = ++latest.current;
    setDisplay(next);
    setFailed(false);
    apply(next);
    // A failed request (offline) is a failed save too (review 1).
    const saved = await action(next).then(
      (result) => result.ok,
      () => false,
    );
    if (saved || mine !== latest.current) return;
    setDisplay(before);
    apply(before);
    setFailed(true);
  };
  // A choice made before hydration is in the DOM, not in state (ADR-0044, review 1): take it in.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const checked = (name: string) =>
      root.current!.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)!.value;
    const typed = { theme: checked('theme') as Theme, accent: checked('accent') as Accent };
    if (typed.theme !== theme || typed.accent !== accent) void choose(typed);
    // Once, on mount: later choices arrive through onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the DOM as it was at hydration
  }, []);
  return (
    <div ref={root} className="flex flex-col gap-6 px-4 py-3">
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
