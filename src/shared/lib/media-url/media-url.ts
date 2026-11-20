import { env } from '@/shared/config/index.server';

/** The public URL of a stored image (served from another origin: NFR-SEC-07), or null. */
export const mediaUrl = (key: string | null): string | null =>
  key ? `${env.NEXT_PUBLIC_MEDIA_BASE_URL}/${key}` : null;
