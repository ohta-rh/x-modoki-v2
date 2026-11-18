import type { FollowListType } from '@/entities/user';
import { getFollows } from '@/entities/user/index.server';

type Context = { params: Promise<{ username: string }> };

const TYPES: readonly FollowListType[] = ['following', 'followers'];

/** GET /api/users/{username}/follows?type=&cursor= — one page of a follow list (#24). */
export async function getUserFollows(request: Request, { params }: Context): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const type = query.get('type') as FollowListType;
  if (!TYPES.includes(type)) return Response.json({ error: 'VALIDATION' }, { status: 400 });
  const result = await getFollows((await params).username, type, query.get('cursor') || null);
  if (result.ok) return Response.json(result.page);
  return result.error === 'NOT_FOUND'
    ? Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    : Response.json({ error: 'VALIDATION' }, { status: 400 });
}
