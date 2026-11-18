/** The composer's draft (#28): kept in this browser only, text alone. Storage may be refused. */
const KEY = 'x-modoki:compose-draft';
/**
 * Told within this tab only. Another tab's change is not followed: a composer open here keeps what
 * is being written (review 1 of #28); it reads the draft again the next time it opens.
 */
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
  return () => window.removeEventListener(CHANGED, onChange);
}
