import type { NextConfig } from 'next';
// Validate the environment at build and start time (src/shared/config/env.ts).
import './src/shared/config/env';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  images: { unoptimized: true },
};

export default nextConfig;
