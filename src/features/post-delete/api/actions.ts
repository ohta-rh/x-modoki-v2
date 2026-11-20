'use server';

import { parseId } from '@/shared/lib/id';
import type { DeletePostActionResult } from '../model/types';
import { deletePost } from './delete-post';

const MESSAGES = {
  UNAUTHORIZED: 'ログインしてください',
  NOT_FOUND: 'この投稿は見つかりません',
  FORBIDDEN: 'この投稿は削除できません',
} as const;

export async function deletePostAction(postId: string): Promise<DeletePostActionResult> {
  const id = parseId(String(postId));
  const result = id === null ? ({ ok: false, error: 'NOT_FOUND' } as const) : await deletePost(id);
  if (!result.ok && result.error !== 'NOT_FOUND')
    return { ok: false, message: MESSAGES[result.error] };
  return result.ok ? { ok: true } : { ok: false, message: MESSAGES.NOT_FOUND };
}
