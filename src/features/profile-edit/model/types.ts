import type { ProfileInput } from './schema';

/** What the profile editor gets back (application-structure.md 4). */
export type UpdateProfileActionResult =
  | { ok: true }
  | {
      ok: false;
      // OFFLINE: the request never reached the server; only the form gives it (#70).
      code: 'VALIDATION' | 'UNAUTHORIZED' | 'OFFLINE';
      fieldErrors: Partial<Record<keyof ProfileInput, string[]>>;
      message?: string;
    };
