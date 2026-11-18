import 'server-only';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import type { PostPage } from '@/entities/post';
import { getBookmarks } from '@/entities/post/index.server';
import { getSession } from '@/shared/auth/index.server';
import { LOGIN_PATH } from '@/shared/config';

export type BookmarksPageData = { username: string; firstPage: PostPage; now: string };

/** /i/bookmarks (#21): the first page of the viewer's bookmarks, read on the server. */
export async function loadBookmarksPage(): Promise<BookmarksPageData> {
  await connection(); // read per request, never while prerendering
  const viewer = await getSession();
  const result = await getBookmarks(null);
  if (!viewer || !result.ok) redirect(LOGIN_PATH);
  return { username: viewer.username, firstPage: result.page, now: new Date().toISOString() };
}
