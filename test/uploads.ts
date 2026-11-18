// Puts real bytes in the Garage from Docker Compose with a media row, as a finished upload would.
import { media } from '@/shared/db';
import { newId } from '@/shared/lib/id';
import { presignUpload } from '@/shared/storage';
import { testDb } from './db';

const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];

/** The first bytes of a WebP of this size (a VP8X header), enough for the header check. */
export const webpHead = (width: number, height: number) =>
  new Uint8Array([
    ...[...'RIFF'].map((c) => c.charCodeAt(0)),
    0,
    0,
    0,
    0,
    ...[...'WEBPVP8X'].map((c) => c.charCodeAt(0)),
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...le24(width - 1),
    ...le24(height - 1),
  ]);

/** The first bytes of a JPEG of this size, as a browser's canvas writes it (ADR-0043). */
export const jpegHead = (width: number, height: number) =>
  new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0,
    16,
    ...[...'JFIF'].map((c) => c.charCodeAt(0)),
    0,
    1,
    1,
    0,
    0,
    1,
    0,
    1,
    0,
    0,
    // A quantisation table long enough to push the size past the first 32 bytes.
    0xff,
    0xdb,
    0,
    67,
    0,
    ...new Array(64).fill(1),
    0xff,
    0xc0,
    0,
    17,
    8,
    height >> 8,
    height & 255,
    width >> 8,
    width & 255,
    3,
  ]);

export const pngHead = () =>
  new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1,
    44, 0, 0, 0, 200, 8, 6, 0, 0, 0, 0, 0, 0,
  ]);

export async function makeUpload(
  ownerId: string,
  { bytes = webpHead(300, 200), mime = 'image/webp', width = 300, height = 200, put = true } = {},
) {
  const key = `test/${crypto.randomUUID()}.webp`;
  const [row] = await testDb()
    .insert(media)
    .values({ id: newId(), ownerId, key, mime, width, height })
    .returning();
  if (put) {
    const url = await presignUpload({ key, contentType: mime, contentLength: bytes.length });
    const response = await fetch(url, {
      method: 'PUT',
      body: bytes,
      headers: { 'content-type': mime },
    });
    if (!response.ok) throw new Error(`upload ${response.status}`);
  }
  return row;
}
