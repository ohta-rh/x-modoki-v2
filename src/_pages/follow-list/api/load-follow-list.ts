import 'server-only';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import type { FollowListType, FollowPage, Profile } from '@/entities/user';
import { getFollows, getProfile } from '@/entities/user/index.server';
import { getSession } from '@/shared/auth/index.server';

export type FollowListData = {
  profile: Profile;
  type: FollowListType;
  firstPage: FollowPage;
  signedIn: boolean;
};

/** /{username}/following and /followers (#24): 404 for a user that does not exist. */
export async function loadFollowList(
  username: string,
  type: FollowListType,
): Promise<FollowListData> {
  await connection();
  const result = await getProfile(username);
  if (!result.ok) notFound();
  const { profile } = result;
  // The user exists and there is no cursor, so the list reads.
  const list = (await getFollows(profile.username, type, null)) as Extract<
    Awaited<ReturnType<typeof getFollows>>,
    { ok: true }
  >;
  return { profile, type, firstPage: list.page, signedIn: (await getSession()) !== null };
}
