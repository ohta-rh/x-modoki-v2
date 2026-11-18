'use server';

import { profileSchema } from '../model/schema';
import type { UpdateProfileActionResult } from '../model/types';
import { updateProfile } from './update-profile';

const MESSAGES = {
  UNAUTHORIZED: 'ログインしてください',
  VALIDATION: '画像を保存できませんでした',
} as const;

/** Validates and saves the viewer's profile (#23), with a new avatar or banner (#25). */
export async function updateProfileAction(input: unknown): Promise<UpdateProfileActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const result = await updateProfile(parsed.data);
  return result.ok
    ? { ok: true }
    : {
        ok: false,
        code: result.error,
        fieldErrors: {},
        message: MESSAGES[result.error],
      };
}
