import { getReplies } from '@/entities/post/index.server';
import { parseId } from '@/shared/lib/id';

type Context = { params: Promise<{ id: string }> };

/** GET /api/posts/{id}/replies?cursor= — direct replies, oldest first (#20). */
export async function getPostReplies(request: Request, { params }: Context): Promise<Response> {
  const postId = parseId((await params).id);
  if (postId === null) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  const raw = new URL(request.url).searchParams.get('cursor') || null;
  const cursor = raw === null ? null : parseId(raw);
  if (raw !== null && cursor === null)
    return Response.json({ error: 'VALIDATION' }, { status: 400 });
  return Response.json(await getReplies(postId, cursor));
}
