'use server';

import { profileSchema } from '../model/schema';
import type { UpdateProfileActionResult } from '../model/types';
import { updateProfile } from './update-profile';

/** Validates and saves the viewer's profile (#23). */
export async function updateProfileAction(input: unknown): Promise<UpdateProfileActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const result = await updateProfile(parsed.data);
  return result.ok
    ? { ok: true }
    : { ok: false, code: 'UNAUTHORIZED', fieldErrors: {}, message: 'ログインしてください' };
}
