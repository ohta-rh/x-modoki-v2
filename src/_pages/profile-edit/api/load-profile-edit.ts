import 'server-only';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getProfile } from '@/entities/user/index.server';
import type { ProfileInput } from '@/features/profile-edit';
import { getSession } from '@/shared/auth/index.server';
import { LOGIN_PATH } from '@/shared/config';

export type ProfileEditData = { username: string; initial: ProfileInput };

/** /settings/profile (#23): the viewer's own values, to edit. */
export async function loadProfileEdit(): Promise<ProfileEditData> {
  await connection();
  const viewer = await getSession();
  if (!viewer) redirect(LOGIN_PATH);
  // The viewer exists, so their profile does too.
  const { profile } = (await getProfile(viewer.username)) as Extract<
    Awaited<ReturnType<typeof getProfile>>,
    { ok: true }
  >;
  return {
    username: profile.username,
    initial: {
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
    },
  };
}
