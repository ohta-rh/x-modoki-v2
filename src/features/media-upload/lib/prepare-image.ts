import { coverSize, fitWithin } from '@/shared/lib/image';

export type ImageKind = 'post' | 'avatar' | 'banner';
export type PreparedImage = { blob: Blob; width: number; height: number };

const LONG_SIDE = 2048;
const QUALITY = 0.85;
const BOXES = { avatar: [400, 400], banner: [1500, 500] } as const;

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

/**
 * WebP; where the browser cannot write WebP (Safari hands back PNG), JPEG at the same quality
 * (ADR-0043). Both are accepted by the server's checks.
 */
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  for (const type of ['image/webp', 'image/jpeg']) {
    const blob = await toBlob(canvas, type);
    if (blob?.type === type) return blob;
  }
  throw new Error('image encoding unsupported');
}

/**
 * Turns a chosen file into what is uploaded (#25, ADR-0018, in the browser — never on the
 * server): a post image becomes a WebP (JPEG on Safari, ADR-0043) whose long side is at most
 * 2048px, a GIF stays as it is;
 * an avatar is cropped to 400×400 and a banner to 1500×500.
 */
export async function prepareImage(file: File, kind: ImageKind): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  if (kind === 'post') {
    if (file.type === 'image/gif')
      return { blob: file, width: bitmap.width, height: bitmap.height };
    const size = fitWithin(bitmap.width, bitmap.height, LONG_SIDE);
    canvas.width = size.width;
    canvas.height = size.height;
    context.drawImage(bitmap, 0, 0, size.width, size.height);
  } else {
    const [width, height] = BOXES[kind];
    const crop = coverSize(bitmap.width, bitmap.height, width, height);
    canvas.width = width;
    canvas.height = height;
    context.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
  }
  bitmap.close();
  return { blob: await encode(canvas), width: canvas.width, height: canvas.height };
}

/**
 * Uploads a prepared image (#25, ADR-0008): asks the app for a 60-second signed URL, then puts
 * the bytes straight into storage. Returns the media id to attach.
 */
export async function uploadImage(image: PreparedImage): Promise<string> {
  const presign = await fetch('/api/uploads/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contentType: image.blob.type,
      contentLength: image.blob.size,
      width: image.width,
      height: image.height,
    }),
  });
  if (!presign.ok) throw new Error(`presign ${presign.status}`);
  const { id, url } = (await presign.json()) as { id: string; url: string };
  const put = await fetch(url, {
    method: 'PUT',
    body: image.blob,
    headers: { 'content-type': image.blob.type },
  });
  if (!put.ok) throw new Error(`upload ${put.status}`);
  return id;
}
