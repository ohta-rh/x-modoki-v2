'use client';

import { useEffect } from 'react';
import { applyDisplay, type Display, writeDisplayCookies } from '../lib/apply-display';

/**
 * Keeps the look in step with the account (#29 review 1): the head script draws from the cookie,
 * which another browser, cleared cookies or another account on the same browser leave out of date.
 * When the account's saved look differs from <html>, it is put on and written to the cookies.
 */
export function DisplaySync({ theme, accent }: Display) {
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.theme === theme && html.dataset.accent === accent) return;
    applyDisplay({ theme, accent });
    writeDisplayCookies({ theme, accent });
  }, [theme, accent]);
  return null;
}
