import { expect, test } from '@playwright/test';

/** The directives of a Content-Security-Policy header, by name. */
const directives = (csp: string) =>
  new Map(
    csp
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...values]) => [name, values]),
  );

// NFR-SEC-09: 応答のセキュリティのヘッダー（T-17）
test.describe('セキュリティのヘッダー（#33）', () => {
  test('ページと API の応答に 4 つのヘッダーがあり、CSP は自分のサイトと画像の配信元だけを許す', async ({
    request,
  }) => {
    for (const path of ['/', '/i/flow/login', '/api/timeline/following']) {
      const response = await request.get(path, { maxRedirects: 0 });
      const headers = response.headers();
      expect(headers['x-content-type-options'], path).toBe('nosniff');
      expect(headers['x-frame-options'], path).toBe('DENY');
      expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
      const csp = directives(headers['content-security-policy'] ?? '');
      expect(csp.get('default-src'), path).toEqual(["'self'"]);
      expect(csp.get('frame-ancestors'), path).toEqual(["'none'"]);
      expect(csp.get('object-src'), path).toEqual(["'none'"]);
      // Images: this site, the media host, and the composer's local previews. No wildcard.
      const images = csp.get('img-src') ?? [];
      expect(images.slice(0, 3), path).toEqual(["'self'", 'blob:', 'data:']);
      expect(images.slice(3), path).toHaveLength(1);
      expect(images[3], path).toMatch(/^https?:\/\/[^*/]+$/);
    }
  });
});
