/** What a like button gets back: the post's count after the change, or a message to show. */
export type ReactionActionResult = { ok: true; count: number } | { ok: false; message: string };
