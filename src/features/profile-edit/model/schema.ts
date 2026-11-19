import { z } from 'zod';
import { cleanText } from '@/shared/lib/text';

const ID = /^[1-9][0-9]*$/;
const HTTP = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/** Text as stored and searched: NFC like posts (#66), trimmed. */
const text = () => z.string().overwrite(cleanText);

/** What the profile editor may change (#23): lengths as on X; links only http(s) (no javascript:). */
export const profileSchema = z.object({
  name: text().min(1, '名前を入れてください').max(50, '名前は 50 文字までです'),
  bio: text().max(160, '自己紹介は 160 文字までです'),
  location: text().max(30, '場所は 30 文字までです'),
  website: text()
    .max(100, 'ウェブサイトは 100 文字までです')
    .refine((url) => url === '' || HTTP.test(url), 'http か https の URL を入れてください'),
  /** A new avatar or banner: an upload's ID (#25); absent keeps the current one. */
  avatarId: z.string().regex(ID).optional(),
  bannerId: z.string().regex(ID).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
