/** What the composer gets back from createPostAction: the new post's id on success (#28). */
export type CreatePostActionResult = { ok: true; id: string } | { ok: false; message: string };
