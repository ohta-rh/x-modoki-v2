import 'server-only';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import type { PostDetail } from '@/entities/post';
import { getPostDetail } from '@/entities/post/index.server';
import { getSession } from '@/shared/auth/index.server';
import { parseId } from '@/shared/lib/id';

export type PostDetailData = {
  detail: PostDetail;
  now: string;
  signedIn: boolean;
  /** The image the viewer shows, from 1 (`/photo/{n}`, #25); null on the detail itself. */
  photo: number | null;
};

/**
 * /{username}/status/{id} and its /photo/{n} (routing.md 1, 3): 404 for an ID that is not a post
 * or an image the post does not have, and one canonical URL — a username that is not the
 * author's (in any case) redirects to the author's.
 */
export async function loadPostDetail(
  username: string,
  postId: string,
  photoNumber?: string,
): Promise<PostDetailData> {
  await connection();
  const id = parseId(postId);
  if (id === null) notFound();
  const result = await getPostDetail(id);
  if (!result.ok) notFound();
  const photo = photoNumber === undefined ? null : Number(photoNumber);
  const images = result.detail.post.media.length;
  if (photo !== null && !(/^[1-9][0-9]*$/.test(photoNumber!) && photo <= images)) notFound();
  const author = result.detail.post.author.username;
  const path = `/${author}/status/${result.detail.post.id}${photo === null ? '' : `/photo/${photo}`}`;
  if (username !== author) redirect(path as Route);
  return {
    detail: result.detail,
    now: new Date().toISOString(),
    signedIn: (await getSession()) !== null,
    photo,
  };
}
