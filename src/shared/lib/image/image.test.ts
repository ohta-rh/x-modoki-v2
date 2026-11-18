import { describe, expect, it } from 'vitest';
import { coverSize, fitWithin, sniffImage } from './image';

describe('fitWithin（#25、ADR-0018: 長辺 2048px 以下）', () => {
  it('長辺が上限を超えるときだけ、比率を保って縮める（整数に丸める）', () => {
    expect(fitWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(1000, 3000, 2048)).toEqual({ width: 683, height: 2048 });
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(3000, 1, 2048)).toEqual({ width: 2048, height: 1 });
  });
});

describe('coverSize（アバター 400×400、バナー 1500×500）', () => {
  it('枠いっぱいに覆うように中央を切り出す範囲を返す', () => {
    expect(coverSize(1000, 500, 400, 400)).toEqual({ sx: 250, sy: 0, sw: 500, sh: 500 });
    expect(coverSize(600, 1200, 1500, 500)).toEqual({ sx: 0, sy: 500, sw: 600, sh: 200 });
  });
});

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === 'string' ? [...part].map((c) => c.charCodeAt(0)) : part,
    ),
  );
const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];

describe('sniffImage（#25、T-07: 先頭のバイトで種類と縦横を確かめる）', () => {
  it('WebP の VP8X・VP8L・VP8 と GIF の縦横を読む', () => {
    expect(
      sniffImage(
        bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8X', [0, 0, 0, 0, 0, 0, 0, 0], le24(299), le24(199)),
      ),
    ).toEqual({
      type: 'image/webp',
      width: 300,
      height: 200,
    });
    // VP8L: 14 bits each of width-1 and height-1 after the 0x2f signature.
    const w = 300 - 1;
    const h = 200 - 1;
    const bits = w | (h << 14);
    expect(
      sniffImage(
        bytes(
          'RIFF',
          [0, 0, 0, 0],
          'WEBPVP8L',
          [0, 0, 0, 0, 0x2f],
          [bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >>> 24) & 255],
        ),
      ),
    ).toEqual({ type: 'image/webp', width: 300, height: 200 });
    expect(
      sniffImage(
        bytes(
          'RIFF',
          [0, 0, 0, 0],
          'WEBPVP8 ',
          [0, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a],
          [300 & 255, 300 >> 8, 200, 0],
        ),
      ),
    ).toEqual({ type: 'image/webp', width: 300, height: 200 });
    expect(sniffImage(bytes('GIF89a', [44, 1, 200, 0]))).toEqual({
      type: 'image/gif',
      width: 300,
      height: 200,
    });
  });

  it('JPEG は SOF のマーカーまで読み進めて縦横を読む（Safari の代わりの形、ADR-0043）', () => {
    const jfif = [
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
    ];
    const dqt = [0xff, 0xdb, 0, 5, 0, 1, 2];
    const sof = (marker: number) => [0xff, marker, 0, 17, 8, 0, 200, 1, 44, 3];
    expect(sniffImage(bytes([0xff, 0xd8], jfif, dqt, sof(0xc0)))).toEqual({
      type: 'image/jpeg',
      width: 300,
      height: 200,
    });
    expect(sniffImage(bytes([0xff, 0xd8], jfif, sof(0xc2)))).toEqual({
      type: 'image/jpeg',
      width: 300,
      height: 200,
    });
    // A JPEG whose size marker is beyond what was read: not accepted.
    expect(sniffImage(bytes([0xff, 0xd8], jfif, dqt))).toBeNull();
    expect(sniffImage(bytes([0xff, 0xd8, 0x00, 0x00]))).toBeNull();
  });

  it('PNG・HTML・短すぎる中身は null（画像を装ったファイルを拒む）', () => {
    expect(
      sniffImage(
        bytes([0x89], 'PNG\r\n', [0x1a, 0x0a], [0, 0, 0, 13], 'IHDR', [0, 0, 1, 44, 0, 0, 0, 200]),
      ),
    ).toBeNull();
    expect(sniffImage(bytes('<!doctype html><html>'))).toBeNull();
    expect(
      sniffImage(
        bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8Q', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      ),
    ).toBeNull();
    expect(sniffImage(bytes('GIF8'))).toBeNull();
  });
});
