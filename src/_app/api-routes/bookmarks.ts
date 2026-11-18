import { getBookmarks } from '@/entities/post/index.server';

/** GET /api/bookmarks?cursor= — the viewer's bookmarks, newest bookmark first (#21). */
export async function getBookmarkList(request: Request): Promise<Response> {
  // No cursor, or an empty one (the client's first page), means the newest page.
  const cursor = new URL(request.url).searchParams.get('cursor') || null;
  const result = await getBookmarks(cursor);
  if (result.ok) return Response.json(result.page);
  return Response.json(
    { error: result.error === 'BAD_CURSOR' ? 'VALIDATION' : result.error },
    { status: result.error === 'BAD_CURSOR' ? 400 : 401 },
  );
}
