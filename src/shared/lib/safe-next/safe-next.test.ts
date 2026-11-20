import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath（NFR-SEC-10、T-12 開いた転送）', () => {
  it.each(['/home', '/notifications/mentions', '/taro/status/123?x=1#y'])(
    '%s はそのまま',
    (next) => {
      expect(safeNextPath(next)).toBe(next);
    },
  );

  it.each([
    ['外の URL', 'https://evil.test/'],
    ['プロトコルを省いた外の URL', '//evil.test/'],
    ['バックスラッシュで外へ', '/\\evil.test'],
    ['javascript:', 'javascript:alert(1)'],
    ['相対のパス', 'home'],
    ['空', ''],
    ['無し', null],
    ['改行を含む', '/home\n//evil.test'],
  ])('%s は /home', (_, next) => {
    expect(safeNextPath(next)).toBe('/home');
  });
});
