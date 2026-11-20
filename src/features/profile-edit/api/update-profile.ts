import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { type SealedUpload, sealUploads } from '@/entities/media/index.server';
import { getSession } from '@/shared/auth/index.server';
import { getDb, media, user } from '@/shared/db';
import { PROFILE_IMAGE_BOX } from '@/shared/lib/image';
import { removeObject } from '@/shared/storage';
import type { ProfileInput } from '../model/schema';

export type UpdateProfileResult =
  { ok: true } | { ok: false; error: 'UNAUTHORIZED' | 'VALIDATION' };

const COLUMN = { avatar: 'image', banner: 'banner' } as const;

/** A refusal inside the transaction; throwing it rolls the transaction back. */
class Refused extends Error {}

/**
 * Saves the viewer's own name, bio, location and link (#23), and a new avatar or banner when
 * given (#25): each must be the viewer's own pending upload of exactly the avatar's or the
 * banner's size, and is kept as a sealed copy (entities/media). A replaced image is removed.
 */
export async function updateProfile(input: ProfileInput): Promise<UpdateProfileResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const asked = (['avatar', 'banner'] as const).flatMap((slot) => {
    const id = slot === 'avatar' ? input.avatarId : input.bannerId;
    return id === undefined ? [] : [{ slot, id: BigInt(id) }];
  });
  // An image already this person's avatar or banner is a retry whose answer was lost (#88,
  // ADR-0067): that slot is saved already, so only the other fields are written again.
  const [current] = await getDb()
    .select({ image: user.image, banner: user.banner })
    .from(user)
    .where(eq(user.id, viewer.id));
  const applied =
    asked.length === 0
      ? []
      : await getDb()
          .select({ id: media.id, key: media.key })
          .from(media)
          .where(
            and(
              inArray(
                media.id,
                asked.map((item) => item.id),
              ),
              eq(media.ownerId, viewer.id),
              eq(media.status, 'ready'),
            ),
          );
  const wanted = asked.filter(
    ({ slot, id }) => !applied.some((row) => row.id === id && row.key === current[COLUMN[slot]]),
  );
  const sealed = await Promise.all(
    wanted.map(async ({ slot, id }) => ({
      slot,
      id,
      upload: (await sealUploads(viewer.id, [id], PROFILE_IMAGE_BOX[slot]))?.get(id),
    })),
  );
  const copies = sealed.flatMap((item) => (item.upload ? [item.upload] : []));
  const refuse = async (): Promise<UpdateProfileResult> => {
    await Promise.all(copies.map((upload) => removeObject(upload.to)));
    return { ok: false, error: 'VALIDATION' };
  };
  if (copies.length !== sealed.length) return refuse();
  const keys = Object.fromEntries(
    sealed.map((item) => [COLUMN[item.slot], item.upload!.to]),
  ) as Partial<Record<'image' | 'banner', string>>;

  const replaced = await getDb()
    .transaction(async (tx) => {
      const [before] = await tx
        .select({ image: user.image, banner: user.banner })
        .from(user)
        .where(eq(user.id, viewer.id))
        .for('no key update');
      const claimed = await Promise.all(
        sealed.map((item) =>
          tx
            .update(media)
            .set({ status: 'ready', key: item.upload!.to })
            .where(and(eq(media.id, item.id), eq(media.status, 'pending')))
            .returning({ id: media.id }),
        ),
      );
      if (claimed.some((rows) => rows.length === 0)) throw new Refused();
      await tx
        .update(user)
        .set({
          name: input.name,
          bio: input.bio,
          location: input.location,
          website: input.website,
          ...keys,
          updatedAt: new Date(),
        })
        .where(eq(user.id, viewer.id));
      // The images the new ones replace: their rows go now, their objects after the commit.
      // Only the viewer's own rows: the column could point anywhere (#25 review 2), and only the
      // keys of rows actually deleted lose their objects.
      const old = sealed.flatMap((item) => before[COLUMN[item.slot]] ?? []);
      const removed =
        old.length === 0
          ? []
          : await tx
              .delete(media)
              .where(and(inArray(media.key, old), eq(media.ownerId, viewer.id)))
              .returning({ key: media.key });
      return removed.map((row) => row.key);
    })
    .catch((error: unknown) => (error instanceof Refused ? null : Promise.reject(error)));
  if (replaced === null) return refuse();
  await Promise.all(
    [...copies.map((upload: SealedUpload) => upload.from), ...replaced].map(removeObject),
  );
  return { ok: true };
}
