'use server';

import { parseId } from '@/shared/lib/id';
import type { RepostActionResult } from '../model/types';
import { setRepost } from './set-repost';

const MESSAGES = { UNAUTHORIZED: 'ログインしてください', NOT_FOUND: 'この投稿は見つかりません' };

/** Reposts (`reposted` true) or undoes the viewer's repost of a post (#22). */
export async function setRepostAction(
  postId: string,
  reposted: boolean,
): Promise<RepostActionResult> {
  const id = parseId(String(postId));
  const result =
    id === null
      ? ({ ok: false, error: 'NOT_FOUND' } as const)
      : await setRepost(id, reposted === true);
  return result.ok
    ? { ok: true, count: result.count }
    : { ok: false, code: result.error, message: MESSAGES[result.error] };
}
