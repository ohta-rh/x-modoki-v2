/** What the repost menu gets back: the original's count after the change, or a message to show. */
export type RepostActionResult =
  { ok: true; count: number } | { ok: false; code: 'UNAUTHORIZED' | 'NOT_FOUND'; message: string };
