/**
 * The composer's draft (#28): kept in this browser only, text alone, one per person so another
 * account signing in on the same browser never sees it (#79). Storage may be refused.
 */
const key = (username: string) => `x-modoki:compose-draft:${username}`;
/** The shared key before #79: whoever wrote it is unknown, so it is shown to no one. */
const OLD_KEY = 'x-modoki:compose-draft';
/**
 * Told within this tab only. Another tab's change is not followed: a composer open here keeps what
 * is being written (review 1 of #28); it reads the draft again the next time it opens.
 */
const CHANGED = 'x-modoki:compose-draft-changed';

export function readDraft(username: string): string {
  try {
    window.localStorage.removeItem(OLD_KEY);
    return window.localStorage.getItem(key(username)) ?? '';
  } catch {
    return '';
  }
}

export function saveDraft(username: string, text: string) {
  try {
    window.localStorage.setItem(key(username), text);
  } catch {
    // Not kept: the next open starts empty.
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function clearDraft(username: string) {
  try {
    window.localStorage.removeItem(key(username));
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
