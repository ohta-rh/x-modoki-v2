import { searchPosts } from '@/entities/post/index.server';
import { searchUsers } from '@/entities/user/index.server';
import { z } from 'zod';
import { searchQuery } from '@/features/search-box';

/** The tab; none means 「話題」 (NFR-SEC-02: anything else is refused, #62). */
const filterSchema = z.enum(['top', 'live', 'user', 'media']).default('top');

const invalid = () => Response.json({ error: 'VALIDATION' }, { status: 400 });

/** GET /api/search?q=&f=&cursor= — the next page of a search's tab (#27). */
export async function getSearch(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const q = searchQuery(params.get('q'));
  if (q === null) return invalid();
  const f = filterSchema.safeParse(params.get('f') ?? undefined);
  if (!f.success) return invalid();
  const filter = f.data;
  // No cursor, or an empty one (the client's first page), means the first page.
  const cursor = params.get('cursor') || null;
  const result =
    filter === 'user' ? await searchUsers(q, cursor) : await searchPosts(q, filter, cursor);
  if (result.ok) return Response.json(result.page);
  // Search is for people signed in (routing.md 1, #33); a broken cursor is the caller's mistake.
  return result.error === 'UNAUTHORIZED'
    ? Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    : invalid();
}
