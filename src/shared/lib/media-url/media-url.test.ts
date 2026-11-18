import { describe, expect, it } from 'vitest';
import { mediaUrl } from './media-url';

describe('mediaUrl', () => {
  it('画像のキーを、公開の URL（NEXT_PUBLIC_MEDIA_BASE_URL）につなぐ。キーが無ければ null', () => {
    expect(mediaUrl('avatars/a.webp')).toBe(
      `${process.env.NEXT_PUBLIC_MEDIA_BASE_URL}/avatars/a.webp`,
    );
    expect(mediaUrl(null)).toBeNull();
  });
});
