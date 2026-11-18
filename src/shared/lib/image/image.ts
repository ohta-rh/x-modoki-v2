/** The size an image is scaled to so that its long side is at most `max` (ADR-0018). */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The centred part of a `width`×`height` image that covers a `targetW`×`targetH` box (avatar, banner). */
export function coverSize(width: number, height: number, targetW: number, targetH: number) {
  const scale = Math.min(width / targetW, height / targetH);
  const sw = Math.round(targetW * scale);
  const sh = Math.round(targetH * scale);
  return { sx: Math.round((width - sw) / 2), sy: Math.round((height - sh) / 2), sw, sh };
}

export type SniffedImage = {
  type: 'image/webp' | 'image/gif' | 'image/jpeg';
  width: number;
  height: number;
};

const be16 = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1];
// Start-of-frame markers carry the size: baseline, extended, progressive, lossless.
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3]);

/** A JPEG's size, from the first start-of-frame marker within the bytes read. */
function jpegSize(bytes: Uint8Array): SniffedImage | null {
  for (let at = 2; at + 9 <= bytes.length && bytes[at] === 0xff; at += 2 + be16(bytes, at + 2)) {
    if (SOF.has(bytes[at + 1])) {
      return { type: 'image/jpeg', width: be16(bytes, at + 7), height: be16(bytes, at + 5) };
    }
  }
  return null;
}

const text = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));
const le16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const le24 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);

/**
 * The type and size an image really has, read from its first bytes (#25, threat model T-07).
 * Only the types the app stores are recognised (WebP, GIF, and JPEG where a browser cannot write
 * WebP: ADR-0043); anything else — PNG, HTML, SVG — is null.
 */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegSize(bytes);
  if (bytes.length >= 10 && /^GIF8[79]a$/.test(text(bytes, 0, 6))) {
    return { type: 'image/gif', width: le16(bytes, 6), height: le16(bytes, 8) };
  }
  if (bytes.length < 25 || text(bytes, 0, 4) !== 'RIFF' || text(bytes, 8, 4) !== 'WEBP')
    return null;
  const chunk = text(bytes, 12, 4);
  if (chunk === 'VP8X' && bytes.length >= 30) {
    return { type: 'image/webp', width: le24(bytes, 24) + 1, height: le24(bytes, 27) + 1 };
  }
  if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { type: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (
    chunk === 'VP8 ' &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      type: 'image/webp',
      width: le16(bytes, 26) & 0x3fff,
      height: le16(bytes, 28) & 0x3fff,
    };
  }
  return null;
}
