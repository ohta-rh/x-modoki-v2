/** What the pin menu item gets back. */
export type SetPinActionResult =
  | { ok: true }
  | { ok: false; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'FORBIDDEN' | 'OFFLINE'; message: string };
