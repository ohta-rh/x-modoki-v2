import 'server-only';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import type { PostDetail } from '@/entities/post';
import { getPostDetail } from '@/entities/post/index.server';
import { getSession } from '@/shared/auth/index.server';
import { parseId } from '@/shared/lib/id';

export type PostDetailData = { detail: PostDetail; now: string; signedIn: boolean };

/**
 * /{username}/status/{id} (routing.md 1, 3): 404 for an ID that is not a post, and one canonical
 * URL — a username that is not the author's (in any case) redirects to the author's.
 */
export async function loadPostDetail(username: string, postId: string): Promise<PostDetailData> {
  await connection();
  const id = parseId(postId);
  if (id === null) notFound();
  const result = await getPostDetail(id);
  if (!result.ok) notFound();
  const author = result.detail.post.author.username;
  if (username !== author) redirect(`/${author}/status/${result.detail.post.id}` as Route);
  return {
    detail: result.detail,
    now: new Date().toISOString(),
    signedIn: (await getSession()) !== null,
  };
}
