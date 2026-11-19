import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
// Validate the environment at build and start time (src/shared/config/env.ts).
import { env } from './src/shared/config/env';
import { securityHeaders, uploadOrigin } from './src/shared/config/security-headers';

export default function config(phase: string): NextConfig {
  const headers = securityHeaders({
    mediaOrigin: new URL(env.NEXT_PUBLIC_MEDIA_BASE_URL).origin,
    uploadOrigin: uploadOrigin({
      endpoint: env.S3_ENDPOINT,
      bucket: env.S3_BUCKET,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    }),
    development: phase === PHASE_DEVELOPMENT_SERVER,
  });
  return {
    cacheComponents: true,
    partialPrefetching: true,
    typedRoutes: true,
    images: { unoptimized: true },
    // T-17 (NFR-SEC-09, ADR-0061): on every response, pages and API alike.
    headers: async () => [{ source: '/:path*', headers }],
  };
}
