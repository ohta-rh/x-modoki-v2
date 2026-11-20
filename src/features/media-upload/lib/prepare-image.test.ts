// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareImage, uploadImage } from './prepare-image';

// jsdom has no image decoding or canvas encoding: the browser parts are stood in for, and the
// test checks what is asked of them (sizes, type, quality).
let drawn: number[] = [];
let encoded: { type?: string; quality?: number } = {};
beforeEach(() => {
  drawn = [];
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })),
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ({ drawImage: (...args: number[]) => (drawn = args.slice(1)) }) as never,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    done,
    type,
    quality,
  ) {
    encoded = { type, quality };
    done(new Blob([`${this.width}x${this.height}`], { type: type ?? 'image/png' }));
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('prepareImage（#25、ADR-0018）', () => {
  // FR-POST-06: 画像の種類と大きさ
  it('投稿の画像は長辺 2048px 以下の WebP（品質 0.85）にする', async () => {
    const result = await prepareImage(new File(['x'], 'a.png', { type: 'image/png' }), 'post');
    expect(result).toMatchObject({ width: 2048, height: 1536 });
    expect(result.blob.type).toBe('image/webp');
    expect(encoded).toEqual({ type: 'image/webp', quality: 0.85 });
    expect(drawn).toEqual([0, 0, 2048, 1536]);
  });

  it('GIF はそのまま（縦横だけ読む）', async () => {
    const gif = new File(['GIF89a'], 'a.gif', { type: 'image/gif' });
    const result = await prepareImage(gif, 'post');
    expect(result).toEqual({ blob: gif, width: 4000, height: 3000 });
  });

  it('アバターは 400×400、バナーは 1500×500 に、中央を切り出して縮める', async () => {
    const avatar = await prepareImage(new File(['x'], 'a.png', { type: 'image/png' }), 'avatar');
    expect(avatar).toMatchObject({ width: 400, height: 400 });
    expect(drawn).toEqual([500, 0, 3000, 3000, 0, 0, 400, 400]);
    const banner = await prepareImage(new File(['x'], 'b.gif', { type: 'image/gif' }), 'banner');
    expect(banner).toMatchObject({ width: 1500, height: 500 });
    expect(banner.blob.type).toBe('image/webp');
  });

  it('WebP にできないブラウザ（Safari）では、JPEG（品質 0.85）にする（ADR-0043）', async () => {
    const asked: (string | undefined)[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done, type, quality) => {
      asked.push(`${type} ${quality}`);
      // WebKit writes PNG when asked for WebP, and JPEG when asked for JPEG.
      done(new Blob(['x'], { type: type === 'image/jpeg' ? 'image/jpeg' : 'image/png' }));
    });
    const result = await prepareImage(new File(['x'], 'a.png', { type: 'image/png' }), 'post');
    expect(result.blob.type).toBe('image/jpeg');
    expect(asked).toEqual(['image/webp 0.85', 'image/jpeg 0.85']);
  });

  it('どちらにもできなければ投げる', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) => done(null));
    await expect(
      prepareImage(new File(['x'], 'a.png', { type: 'image/png' }), 'post'),
    ).rejects.toThrow('encoding');
  });
});

describe('uploadImage（#25）', () => {
  it('署名を求め、その URL へ PUT し、media の ID を返す', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: '42', url: 'http://storage.test/put' }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const blob = new Blob(['12345'], { type: 'image/webp' });
    expect(await uploadImage({ blob, width: 3, height: 4 })).toBe('42');
    expect(fetchSpy).toHaveBeenNthCalledWith(1, '/api/uploads/presign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contentType: 'image/webp', contentLength: 5, width: 3, height: 4 }),
    });
    expect(fetchSpy).toHaveBeenNthCalledWith(2, 'http://storage.test/put', {
      method: 'PUT',
      body: blob,
      headers: { 'content-type': 'image/webp' },
    });
  });

  it('署名か PUT が失敗したら投げる', async () => {
    const blob = new Blob(['1'], { type: 'image/webp' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 429 })));
    await expect(uploadImage({ blob, width: 1, height: 1 })).rejects.toThrow('presign 429');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ id: '1', url: 'http://storage.test/put' }))
        .mockResolvedValueOnce(new Response(null, { status: 403 })),
    );
    await expect(uploadImage({ blob, width: 1, height: 1 })).rejects.toThrow('upload 403');
  });
});
