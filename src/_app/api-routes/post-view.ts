import { after } from 'next/server';
import { countView } from '@/features/post-view-count/index.server';
import { parseId } from '@/shared/lib/id';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/posts/{id}/view — counts one view of a post's detail (#21). The count is written after
 * the response (ADR-0011): a lost view is acceptable, so a failure is logged and never surfaces.
 */
export async function postView(_request: Request, { params }: Context): Promise<Response> {
  const postId = parseId((await params).id);
  if (postId === null) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  after(async () => {
    try {
      await countView(postId);
    } catch (error) {
      console.error('view count failed', error);
    }
  });
  return new Response(null, { status: 204 });
}
