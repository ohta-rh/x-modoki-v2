/**
 * The headers on every response (T-17, NFR-SEC-09, ADR-0061). The Content-Security-Policy allows
 * this site, the media host for images and the storage endpoint for the browser's direct uploads.
 * Scripts and styles allow inline code: Next.js streams its rendering with inline scripts into a
 * page prerendered without a request, so a per-request nonce cannot reach them.
 */
export function securityHeaders({
  mediaOrigin,
  uploadOrigin,
  development,
}: {
  mediaOrigin: string;
  uploadOrigin: string;
  /** `next dev`: its tooling evaluates code. Never on a build. */
  development: boolean;
}): { key: string; value: string }[] {
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    // blob: and data: are the composer's previews of images not yet uploaded (#25).
    `img-src 'self' blob: data: ${mediaOrigin}`,
    "font-src 'self'",
    `connect-src 'self' ${uploadOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  return [
    { key: 'Content-Security-Policy', value: policy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ];
}

/** Where the browser PUTs a presigned upload: the endpoint, or its bucket's subdomain. */
export function uploadOrigin({
  endpoint,
  bucket,
  forcePathStyle,
}: {
  endpoint: string;
  bucket: string;
  forcePathStyle: boolean;
}): string {
  const url = new URL(endpoint);
  return forcePathStyle ? url.origin : `${url.protocol}//${bucket}.${url.host}`;
}
