/** The query's limit (#27): longer is refused, not cut. */
export const MAX_QUERY_LENGTH = 100;

export type SearchFilter = 'top' | 'live' | 'user' | 'media';

/** The query as searched: trimmed, 1 to 100 characters; null when it cannot be searched. */
export function searchQuery(q: string | null): string | null {
  const trimmed = (q ?? '').trim();
  return trimmed.length === 0 || trimmed.length > MAX_QUERY_LENGTH ? null : trimmed;
}

/** `f` of /search: live, user and media; anything else is 話題 (top). */
export function searchFilter(f: string | null): SearchFilter {
  return f === 'live' || f === 'user' || f === 'media' ? f : 'top';
}
