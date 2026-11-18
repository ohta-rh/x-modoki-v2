import type { UserPostsTab } from '@/entities/post';
import { getUserPosts } from '@/entities/post/index.server';

type Context = { params: Promise<{ username: string }> };

const TABS: readonly UserPostsTab[] = ['posts', 'with_replies', 'media', 'likes'];
const STATUS = { NOT_FOUND: 404, FORBIDDEN: 403, BAD_CURSOR: 400 } as const;

/** GET /api/users/{username}/posts?tab=&cursor= — one page of a profile tab (#23). */
export async function getUserPostList(request: Request, { params }: Context): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const tab = (query.get('tab') || 'posts') as UserPostsTab;
  if (!TABS.includes(tab)) return Response.json({ error: 'VALIDATION' }, { status: 400 });
  const result = await getUserPosts((await params).username, tab, query.get('cursor') || null);
  if (result.ok) return Response.json(result.page);
  return Response.json(
    { error: result.error === 'BAD_CURSOR' ? 'VALIDATION' : result.error },
    { status: STATUS[result.error] },
  );
}
