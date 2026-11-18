'use server';

import { parseId } from '@/shared/lib/id';
import type { ReactionActionResult } from '../model/types';
import { setLike } from './set-like';

const MESSAGES = { UNAUTHORIZED: 'ログインしてください', NOT_FOUND: 'この投稿は見つかりません' };

/** Likes (`liked` true) or unlikes a post (#21). */
export async function setLikeAction(postId: string, liked: boolean): Promise<ReactionActionResult> {
  const id = parseId(String(postId));
  const result =
    id === null ? ({ ok: false, error: 'NOT_FOUND' } as const) : await setLike(id, liked === true);
  return result.ok
    ? { ok: true, count: result.count }
    : { ok: false, code: result.error, message: MESSAGES[result.error] };
}
