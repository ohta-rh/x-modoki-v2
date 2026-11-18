import { z } from 'zod';

const ID = /^[1-9][0-9]*$/;
const HTTP = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/** What the profile editor may change (#23): lengths as on X; links only http(s) (no javascript:). */
export const profileSchema = z.object({
  name: z.string().trim().min(1, '名前を入れてください').max(50, '名前は 50 文字までです'),
  bio: z.string().trim().max(160, '自己紹介は 160 文字までです'),
  location: z.string().trim().max(30, '場所は 30 文字までです'),
  website: z
    .string()
    .trim()
    .max(100, 'ウェブサイトは 100 文字までです')
    .refine((url) => url === '' || HTTP.test(url), 'http か https の URL を入れてください'),
  /** A new avatar or banner: an upload's ID (#25); absent keeps the current one. */
  avatarId: z.string().regex(ID).optional(),
  bannerId: z.string().regex(ID).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
