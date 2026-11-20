'use server';

import type { FollowActionResult } from '../model/types';
import { setFollow } from './set-follow';

const MESSAGES = {
  UNAUTHORIZED: 'ログインしてください',
  NOT_FOUND: 'このアカウントは存在しません',
  FORBIDDEN: '自分はフォローできません',
  RATE_LIMITED: 'フォローが多すぎます。しばらく待ってから、もう一度お試しください',
};

/** Follows (`following` true) or unfollows a user by username (#24). */
export async function setFollowAction(
  username: string,
  following: boolean,
): Promise<FollowActionResult> {
  if (typeof username !== 'string') {
    return { ok: false, code: 'NOT_FOUND', message: MESSAGES.NOT_FOUND };
  }
  const result = await setFollow(username, following === true);
  return result.ok
    ? { ok: true, followersCount: result.followersCount }
    : { ok: false, code: result.error, message: MESSAGES[result.error] };
}
