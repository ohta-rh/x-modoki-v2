import 'server-only';
import { eq } from 'drizzle-orm';
import { getSession } from '@/shared/auth/index.server';
import { getDb, user } from '@/shared/db';
import type { ProfileInput } from '../model/schema';

/** Saves the viewer's own name, bio, location and link (#23); nothing else can be changed here. */
export async function updateProfile(input: ProfileInput): Promise<{ ok: boolean }> {
  const viewer = await getSession();
  if (!viewer) return { ok: false };
  await getDb()
    .update(user)
    .set({
      name: input.name,
      bio: input.bio,
      location: input.location,
      website: input.website,
      updatedAt: new Date(),
    })
    .where(eq(user.id, viewer.id));
  return { ok: true };
}
