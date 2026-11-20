import { type Accent, displayCookies, type Theme } from '@/shared/config';

export type Display = { theme: Theme; accent: Accent };

/** Puts a look on <html> at once, as the head script does on the next load (ADR-0051). */
export function applyDisplay({ theme, accent }: Display) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = accent;
}

/** Writes the cookies the head script reads, from the browser. */
export function writeDisplayCookies(display: Display) {
  for (const cookie of displayCookies(display)) {
    document.cookie = `${cookie.name}=${cookie.value}; max-age=${cookie.maxAge}; path=${cookie.path}; samesite=${cookie.sameSite}`;
  }
}
