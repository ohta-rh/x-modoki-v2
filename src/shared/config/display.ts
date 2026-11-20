/** The themes and accent colours (#29, ui-ux.md 4). */
export const THEMES = ['light', 'dim', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const ACCENTS = {
  blue: '#1d9bf0',
  yellow: '#ffd400',
  pink: '#f91880',
  purple: '#7856ff',
  orange: '#ff7a00',
  green: '#00ba7c',
} as const;
export type Accent = keyof typeof ACCENTS;

const YEAR = 60 * 60 * 24 * 365;

/** The cookies that carry the choice to the next first paint (ADR-0051). */
export const displayCookies = ({ theme, accent }: { theme: Theme; accent: Accent }) =>
  [
    { name: 'theme', value: theme },
    { name: 'accent', value: accent },
  ].map((cookie) => ({ ...cookie, maxAge: YEAR, path: '/', sameSite: 'lax' as const }));

/**
 * Runs in the head before the first paint (ADR-0051): copies the theme and accent cookies onto
 * <html>, only when they are one of the known values.
 */
export const DISPLAY_SCRIPT = `(function(){try{var c=document.cookie,h=document.documentElement;function g(n){var m=c.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?m[1]:null}var t=g('theme'),a=g('accent');if(${JSON.stringify(THEMES)}.indexOf(t)>=0)h.setAttribute('data-theme',t);if(${JSON.stringify(Object.keys(ACCENTS))}.indexOf(a)>=0)h.setAttribute('data-accent',a)}catch(e){}})();`;
