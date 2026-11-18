/** The composer's draft (#28): kept in this browser only, text alone. Storage may be refused. */
const KEY = 'x-modoki:compose-draft';
/** Told within this tab; `storage` tells the others. */
const CHANGED = 'x-modoki:compose-draft-changed';

export function readDraft(): string {
  try {
    return window.localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveDraft(text: string) {
  try {
    window.localStorage.setItem(KEY, text);
  } catch {
    // Not kept: the next open starts empty.
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing was kept.
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** For `useSyncExternalStore`: calls `onChange` whenever the draft may have changed. */
export function subscribeDraft(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
}
