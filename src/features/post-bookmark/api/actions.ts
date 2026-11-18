'use server';

import { parseId } from '@/shared/lib/id';
import type { BookmarkActionResult, ClearBookmarksActionResult } from '../model/types';
import { clearBookmarks, setBookmark } from './set-bookmark';

const MESSAGES = { UNAUTHORIZED: 'ログインしてください', NOT_FOUND: 'この投稿は見つかりません' };

/** Bookmarks (`bookmarked` true) or un-bookmarks a post (#21). */
export async function setBookmarkAction(
  postId: string,
  bookmarked: boolean,
): Promise<BookmarkActionResult> {
  const id = parseId(String(postId));
  const result =
    id === null
      ? ({ ok: false, error: 'NOT_FOUND' } as const)
      : await setBookmark(id, bookmarked === true);
  return result.ok
    ? { ok: true, count: result.count }
    : { ok: false, message: MESSAGES[result.error] };
}

/** Removes all of the viewer's bookmarks (#21, 全て削除). */
export async function clearBookmarksAction(): Promise<ClearBookmarksActionResult> {
  const result = await clearBookmarks();
  return result.ok ? { ok: true } : { ok: false, message: MESSAGES.UNAUTHORIZED };
}
