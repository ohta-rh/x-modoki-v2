'use server';

import { parseId } from '@/shared/lib/id';
import type { SetPinActionResult } from '../model/types';
import { setPin } from './set-pin';

const MESSAGES = {
  UNAUTHORIZED: 'ログインしてください',
  NOT_FOUND: 'この投稿は見つかりません',
  FORBIDDEN: 'この投稿は固定できません',
};

/** Pins (`pinned` true) or unpins one of the viewer's posts (#23). */
export async function setPinAction(postId: string, pinned: boolean): Promise<SetPinActionResult> {
  const id = parseId(String(postId));
  const result =
    id === null ? ({ ok: false, error: 'NOT_FOUND' } as const) : await setPin(id, pinned === true);
  return result.ok
    ? { ok: true }
    : { ok: false, code: result.error, message: MESSAGES[result.error] };
}
