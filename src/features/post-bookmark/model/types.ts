/** What a bookmark button gets back: the post's count after the change, or a message to show. */
export type BookmarkActionResult = { ok: true; count: number } | { ok: false; message: string };
/** What the 全て削除 menu gets back. */
export type ClearBookmarksActionResult = { ok: true } | { ok: false; message: string };
