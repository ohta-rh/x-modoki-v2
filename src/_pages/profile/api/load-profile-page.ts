import 'server-only';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import type { PostPage, UserPostsTab } from '@/entities/post';
import { getUserPosts } from '@/entities/post/index.server';
import type { Profile } from '@/entities/user';
import { getProfile } from '@/entities/user/index.server';
import { getSession } from '@/shared/auth/index.server';

export type ProfilePageData = {
  profile: Profile;
  tab: UserPostsTab;
  firstPage: PostPage;
  now: string;
  signedIn: boolean;
};

/**
 * /{username} and its tabs (#23): 404 for a user that does not exist; someone else's いいね tab
 * goes back to the profile, since only the owner may read it.
 */
export async function loadProfilePage(
  username: string,
  tab: UserPostsTab,
): Promise<ProfilePageData> {
  await connection();
  const result = await getProfile(username);
  if (!result.ok) notFound();
  const { profile } = result;
  const posts = await getUserPosts(profile.username, tab, null);
  if (!posts.ok) redirect(`/${profile.username}` as Route);
  return {
    profile,
    tab,
    firstPage: posts.page,
    now: new Date().toISOString(),
    signedIn: (await getSession()) !== null,
  };
}
