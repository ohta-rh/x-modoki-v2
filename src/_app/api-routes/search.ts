import { searchPosts } from '@/entities/post/index.server';
import { searchUsers } from '@/entities/user/index.server';
import { searchFilter, searchQuery } from '@/features/search-box';

const invalid = () => Response.json({ error: 'VALIDATION' }, { status: 400 });

/** GET /api/search?q=&f=&cursor= — the next page of a search's tab (#27). */
export async function getSearch(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const q = searchQuery(params.get('q'));
  if (q === null) return invalid();
  const filter = searchFilter(params.get('f'));
  // No cursor, or an empty one (the client's first page), means the first page.
  const cursor = params.get('cursor') || null;
  const result =
    filter === 'user' ? await searchUsers(q, cursor) : await searchPosts(q, filter, cursor);
  return result.ok ? Response.json(result.page) : invalid();
}
