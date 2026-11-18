import type { ProfileInput } from './schema';

/** What the profile editor gets back (application-structure.md 4). */
export type UpdateProfileActionResult =
  | { ok: true }
  | {
      ok: false;
      code: 'VALIDATION' | 'UNAUTHORIZED';
      fieldErrors: Partial<Record<keyof ProfileInput, string[]>>;
      message?: string;
    };
