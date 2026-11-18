import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * The only place that reads process.env (.claude/rules/architecture-fsd.md). Importing this module
 * validates every variable; next.config.ts imports it, so a missing value stops build and start.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).transform((value) => value === 'true'),
    CRON_SECRET: z.string().min(16),
  },
  client: {
    NEXT_PUBLIC_MEDIA_BASE_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
  },
  emptyStringAsUndefined: true,
});
