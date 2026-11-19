import { describe, expect, it } from 'vitest';
import { securityHeaders, uploadOrigin } from './security-headers';

const header = (name: string, development = false) =>
  securityHeaders({
    mediaOrigin: 'http://media.localhost:3902',
    uploadOrigin: 'http://127.0.0.1:3900',
    development,
  }).find((entry) => entry.key === name)?.value;

// NFR-SEC-09: 応答のセキュリティのヘッダー（T-17）
describe('securityHeaders（#33）', () => {
  it('nosniff・DENY・同じサイトの外へは送り元だけを送る、の 3 つを付ける', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('CSP は自分のサイトを基本にし、画像は画像の配信元、通信はストレージの口だけを足す', () => {
    expect(header('Content-Security-Policy')).toBe(
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data: http://media.localhost:3902",
        "font-src 'self'",
        "connect-src 'self' http://127.0.0.1:3900",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
  });

  it('開発のサーバーでは、Next.js の開発の道具が使う eval だけを足す', () => {
    expect(header('Content-Security-Policy', true)).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
    );
  });
});

describe('uploadOrigin（#33）', () => {
  it('パス形式なら口のオリジン、そうでなければバケットのサブドメイン', () => {
    expect(
      uploadOrigin({ endpoint: 'http://127.0.0.1:3900/', bucket: 'media', forcePathStyle: true }),
    ).toBe('http://127.0.0.1:3900');
    expect(
      uploadOrigin({ endpoint: 'https://s3.example.test', bucket: 'media', forcePathStyle: false }),
    ).toBe('https://media.s3.example.test');
  });
});
